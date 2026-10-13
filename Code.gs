/** Revive Fitness Studio Sheets API
 * Deploy as a Web app, execute as you, access: anyone.
 * Create sheets automatically on first request. See README for setup and PIN hashing.
 */
const SHEETS = {
  Members: ['memberId','name','phone','email','dob','gender','plan','startDate','emergencyPhone','goal','status','createdAt'],
  Attendance: ['attendanceId','memberId','name','date','staff','createdAt'],
  Admissions: ['admissionId','name','phone','email','dob','gender','plan','startDate','emergencyPhone','goal','status','createdAt'],
  Products: ['id','name','description','price','stock','active'],
  Sales: ['saleId','productId','product','memberId','quantity','amount','staff','createdAt'],
  Staff: ['username','name','role','pinHash','active']
};
const DB_ID = ''; // Optional: paste spreadsheet ID. Blank uses the spreadsheet this script is bound to.
function db_(){ return DB_ID ? SpreadsheetApp.openById(DB_ID) : SpreadsheetApp.getActiveSpreadsheet(); }
function json_(data, callback){ const body=JSON.stringify(data); return callback ? ContentService.createTextOutput(`${callback}(${body});`).setMimeType(ContentService.MimeType.JAVASCRIPT) : ContentService.createTextOutput(body).setMimeType(ContentService.MimeType.JSON); }
function sheet_(name){ const ss=db_(); let sh=ss.getSheetByName(name); if(!sh){ sh=ss.insertSheet(name); sh.appendRow(SHEETS[name]); sh.setFrozenRows(1); } return sh; }
function rows_(name){ const sh=sheet_(name); const values=sh.getDataRange().getValues(); if(values.length<2)return []; const headers=values[0].map(String); return values.slice(1).filter(r=>r.some(v=>v!=='')).map(r=>Object.fromEntries(headers.map((h,i)=>[h,r[i] instanceof Date?Utilities.formatDate(r[i],Session.getScriptTimeZone(),'yyyy-MM-dd HH:mm:ss'):r[i]]))); }
function append_(name,obj){ const sh=sheet_(name); const headers=SHEETS[name]; sh.appendRow(headers.map(h=>obj[h]??'')); }
function digest_(text){ return Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256,text,Utilities.Charset.UTF_8).map(b=>(b+256).toString(16).slice(-2)).join(''); }
function authorize_(p,role){ const token=String(p.token||''); const session=CacheService.getScriptCache().get('session_'+token); if(!session)throw new Error('Your session expired. Please sign in again.'); const user=JSON.parse(session); if(role && user.role!==role)throw new Error('Admin access required.'); return user; }
function doGet(e){
  const p=e.parameter||{}, cb=p.callback; try {
    Object.keys(SHEETS).forEach(sheet_);
    let result={ok:true};
    switch(p.action){
      case 'products': if(p.token){authorize_(p,'admin');result.products=rows_('Products');}else{result.products=rows_('Products').filter(x=>String(x.active).toLowerCase()!=='false');} break;
      case 'lookupMember': { const key=String(p.member||'').replace(/\D/g,''); const m=rows_('Members').find(x=>String(x.phone).replace(/\D/g,'')===key||String(x.memberId)===String(p.member)); result.member=m&&String(m.status).toLowerCase()==='active'?m:null; break; }
      case 'challenge': { const username=String(p.username||'').trim(); const nonce=Utilities.getUuid().replace(/-/g,''); CacheService.getScriptCache().put('nonce_'+nonce,username,180); result={ok:true,nonce}; break; }
      case 'login': {
        const username=String(p.username||'').trim(); const cache=CacheService.getScriptCache(); const nonceUser=cache.get('nonce_'+String(p.nonce||'')); cache.remove('nonce_'+String(p.nonce||'')); const user=rows_('Staff').find(x=>String(x.username)===username&&String(x.active).toLowerCase()!=='false');
        if(!user||!user.pinHash||nonceUser!==username||digest_(String(user.pinHash)+':'+String(p.nonce))!==String(p.proof||''))throw new Error('Login was not accepted. Check your ID and PIN.');
        if(p.role==='admin'&&String(user.role).toLowerCase()!=='admin')throw new Error('Admin access required.');
        const token=Utilities.getUuid().replace(/-/g,''); CacheService.getScriptCache().put('session_'+token,JSON.stringify({username:user.username,name:user.name,role:String(user.role).toLowerCase()}),21600); result={ok:true,token,role:String(user.role).toLowerCase(),name:user.name}; break;
      }
      case 'admissions': authorize_(p); result.admissions=rows_('Admissions').filter(x=>String(x.status).toLowerCase()==='pending').reverse().slice(0,100); break;
      case 'summary': { authorize_(p,'admin'); const members=rows_('Members'), at=rows_('Attendance'), ad=rows_('Admissions'), sales=rows_('Sales'), d=Utilities.formatDate(new Date(),Session.getScriptTimeZone(),'yyyy-MM-dd'); result={ok:true,activeMembers:members.filter(x=>String(x.status).toLowerCase()==='active').length,todayAttendance:at.filter(x=>String(x.date).slice(0,10)===d).length,pendingAdmissions:ad.filter(x=>String(x.status).toLowerCase()==='pending').length,todaySales:sales.filter(x=>String(x.createdAt).slice(0,10)===d).reduce((s,x)=>s+Number(x.amount||0),0)}; break; }
      case 'members': case 'attendance': case 'sales': case 'staff': case 'products': { authorize_(p,'admin'); const sheetName={members:'Members',attendance:'Attendance',sales:'Sales',staff:'Staff',products:'Products'}[p.action]; result[p.action]=rows_(sheetName); break; }
      default: if(p.action)throw new Error('Unknown action.');
    }
    return json_(result,cb);
  } catch(err){ return json_({ok:false,error:err.message},cb); }
}
function doPost(e){ try {
  Object.keys(SHEETS).forEach(sheet_); const p=JSON.parse(e.postData.contents||'{}'); const now=new Date();
  switch(p.action){
    case 'admission': append_('Admissions',{...p,admissionId:'ADM-'+Utilities.getUuid().slice(0,8).toUpperCase(),status:'Pending',createdAt:now}); break;
    case 'attendance': { const u=authorize_(p); append_('Attendance',{...p,attendanceId:'ATT-'+Utilities.getUuid().slice(0,8).toUpperCase(),staff:u.name,createdAt:now}); break; }
    case 'sale': { const u=authorize_(p); append_('Sales',{...p,saleId:'SAL-'+Utilities.getUuid().slice(0,8).toUpperCase(),staff:u.name,createdAt:now}); break; }
    default: throw new Error('Unknown write action.');
  }
  return json_({ok:true});
 }catch(err){return json_({ok:false,error:err.message});} }
