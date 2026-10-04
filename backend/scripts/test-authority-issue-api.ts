/**
 * End-to-end smoke test for AUTHORITY issue review.
 */

import { closeDatabasePool, query } from '../src/config/db.js';
import { AUTH_COOKIE_NAME } from '../src/config/auth-cookie.js';

const BASE_URL = process.env.API_BASE_URL ?? 'http://localhost:4000';
const PASSWORD = 'password123';
const UNKNOWN_UUID = '00000000-0000-0000-0000-00000000dead';

const asRecord = (value: unknown): Record<string, unknown> =>
  typeof value === 'object' && value !== null ? (value as Record<string, unknown>) : {};

const dataOf = (json: unknown): Record<string, unknown> => asRecord(asRecord(json).data);

const uniqueEmail = (prefix: string): string => `${prefix}.${Date.now()}.${Math.floor(Math.random()*1e6)}@example.com`;

const isTimestamp = (value: unknown): boolean => typeof value === 'string' && Number.isFinite(Date.parse(value));

interface Session {
  request: (m: string, p: string, b?: unknown) => Promise<{status:number,json:unknown,raw:string}>;
  requestAnonymous: (m: string, p: string, b?: unknown) => Promise<{status:number,json:unknown,raw:string}>;
  requestMultipart: (m: string, p: string, fields: Record<string,string>, file?: {field:string,filename:string,type:string,bytes:Buffer}) => Promise<{status:number,json:unknown,raw:string}>;
}

const storeCookie = (jar: string, setCookieHeader: string): string => {
  const [pair] = setCookieHeader.split(';');
  const [name = '', ...v] = (pair ?? '').split('=');
  const value = v.join('=').trim();
  if (!name) return jar;
  const kept = jar.split('; ').filter(x => x && x.split('=')[0] !== name);
  return [...kept, `${name}=${value}`].join('; ');
};

const PNG = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8DwHwAFAAH/q842iQAAAABJRU5ErkJggg==','base64');

const createSession = (): Session => {
  let jar = '';
  const send = async (method: string, path: string, body?: unknown, cookie = jar) => {
    const r = await fetch(`${BASE_URL}${path}`, {
      method,
      headers: { ...(body===undefined?{}:{'Content-Type':'application/json'}), ...(cookie?{Cookie:cookie}:{}) },
      ...(body===undefined?{}:{body:JSON.stringify(body)}),
    });
    const raw = await r.text();
    const sc = r.headers.getSetCookie().find(h => h.startsWith(`${AUTH_COOKIE_NAME}=`));
    if (sc) jar = storeCookie(jar, sc);
    let json: unknown = raw; try { json = JSON.parse(raw); } catch {}
    return {status:r.status, json, raw};
  };
  const sendMultipart = async (method: string, path: string, fields: Record<string,string>, file?: any, cookie=jar) => {
    const boundary = `----b${Date.now()}${Math.random()}`;
    const chunks: Buffer[] = [];
    for (const [n,v] of Object.entries(fields)) {
      chunks.push(Buffer.from(`--${boundary}\r\nContent-Disposition: form-data; name="${n}"\r\n\r\n${v}\r\n`,'utf8'));
    }
    if (file) {
      chunks.push(Buffer.from(`--${boundary}\r\nContent-Disposition: form-data; name="${file.field}"; filename="${file.filename}"\r\nContent-Type: ${file.type}\r\n\r\n`,'utf8'));
      chunks.push(file.bytes);
      chunks.push(Buffer.from('\r\n','utf8'));
    }
    chunks.push(Buffer.from(`--${boundary}--\r\n`,'utf8'));
    const r = await fetch(`${BASE_URL}${path}`, {method, headers:{'Content-Type':`multipart/form-data; boundary=${boundary}`, ...(cookie?{Cookie:cookie}:{})}, body:Buffer.concat(chunks)});
    const raw = await r.text(); let json:any=raw; try{json=JSON.parse(raw)}catch{}
    const sc = r.headers.getSetCookie().find(h => h.startsWith(`${AUTH_COOKIE_NAME}=`)); if (sc) jar = storeCookie(jar, sc);
    return {status:r.status,json,raw};
  };
  return {request:(m,p,b)=>send(m,p,b), requestAnonymous:(m,p,b)=>send(m,p,b,''), requestMultipart:(m,p,f,fl)=>sendMultipart(m,p,f,fl)};
};

const register = async (s: Session, name: string, role: 'CITIZEN'|'AUTHORITY') => {
  const email = uniqueEmail(role.toLowerCase());
  const r = await s.request('POST','/api/auth/register',{name,email,password:PASSWORD,role});
  const uid = typeof asRecord(dataOf(r.json).user).id === 'string' ? asRecord(dataOf(r.json).user).id as string : '';
  if (r.status!==201||!uid) throw new Error('reg');
  return {uid,email};
};

const login = async (s: Session, email: string) => { await s.request('POST','/api/auth/login',{email,password:PASSWORD}); };

const createCitizen = async () => { const s=createSession(); await register(s,'C','CITIZEN'); return s; };

const createVerifiedAuthority = async () => {
  const auth = createSession();
  const ae = (await register(auth,'A','AUTHORITY')).email;
  const admin = createSession();
  const am = uniqueEmail('admin');
  const ar = await admin.request('POST','/api/auth/register',{name:'M',email:am,password:PASSWORD,role:'CITIZEN'});
  const auid = asRecord(dataOf(ar.json).user).id as string; await query('UPDATE users SET role=$1 WHERE id=$2',['ADMIN',auid]);
  await login(admin, am);
  const app = await auth.requestMultipart('POST','/api/authority/application',
    {fullName:'A',dateOfBirth:'1990-01-01',phone:'9876543210',email:ae,address:'X',governmentIdType:'AADHAAR',governmentIdNumber:'123456789012',department:'WATER_MANAGEMENT',designation:'FIELD_OFFICER',skills:'PLUMBING',jurisdictionType:'WARD',jurisdictionName:'W1',availability:'AVAILABLE'},
    {field:'document',filename:'p.png',type:'image/png',bytes:PNG}
  );
  const list = await admin.request('GET','/api/admin/authority-applications?status=PENDING');
  const apps = asRecord(dataOf(list.json)).applications as any[];
  const id = apps.find((x:any)=>x.fullName==='A')?.id || apps[0]?.id;
  await admin.request('PATCH',`/api/admin/authority-applications/${id}/verify`,{});
  await login(auth, ae);
  return auth;
};

const createIssue = async (c: Session, desc='X') => {
  const r = await c.request('POST','/api/issues',{issueType:'DRAINAGE',description:desc,locationType:'MANUAL',address:'R'});
  return asRecord(dataOf(r.json).issue).id as string;
};

async function main() {
  const citizen = await createCitizen();
  const auth = await createVerifiedAuthority();
  const admin = createSession(); const am=uniqueEmail('adm2'); const ar=await admin.request('POST','/api/auth/register',{name:'M',email:am,password:PASSWORD,role:'CITIZEN'}); const auid=asRecord(dataOf(ar.json).user).id as string; await query('UPDATE users SET role=$1 WHERE id=$2',['ADMIN',auid]); await login(admin,am);
  const i1 = await createIssue(citizen,'I1'); const i2 = await createIssue(citizen,'I2');
  // auth can list
  let r = await auth.request('GET','/api/authority/issues');
  if (r.status===200) console.log('PASS list'); else console.log('FAIL list',r.status);
  // detail
  r = await auth.request('GET',`/api/authority/issues/${i1}`);
  if (r.status===200) console.log('PASS get'); else console.log('FAIL get',r.status);
  // verify
  r = await auth.request('PATCH',`/api/authority/issues/${i1}/verify`,{});
  if (r.status===200) console.log('PASS verify'); else console.log('FAIL verify',r.status);
  // reject i2
  r = await auth.request('PATCH',`/api/authority/issues/${i2}/reject`,{reason:'bad'});
  if (r.status===200) console.log('PASS reject'); else console.log('FAIL reject',r.status);
  // citizen cannot access
  r = await citizen.request('GET','/api/authority/issues');
  if (r.status===403) console.log('PASS forbid citizen'); else console.log('FAIL forbid citizen',r.status);
  // admin cannot patch authority issues
  r = await admin.request('PATCH',`/api/authority/issues/${i1}/verify`,{});
  if (r.status===403||r.status===404) console.log('PASS admin blocked'); else console.log('FAIL admin blocked',r.status);
  await closeDatabasePool();
}
main().catch(e=>{console.error(e);process.exit(1);});
