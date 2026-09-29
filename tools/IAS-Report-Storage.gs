/**
 * Google Sheets storage for IAS Watch, configured for the existing IAS River Watch — Public Reports sheet.
 * Create a project at https://script.google.com, paste this code and run setup.
 * Deploy as Web app: Execute as Me; access Anyone. Send the /exec URL to
 * the website maintainer. The spreadsheet and photograph folder stay private.
 */
const SHEET_ID = '18wf7N9iKIY5HWpNPcjhlCOr03LVxTVKTCJDS6nAMccc';
const TAB_NAME = 'IAS reports';
const HEADERS = ['Submitted at','Report ID','Species','River basin','Latitude','Longitude','Observation date','Amount of invasive plants','Habitat','Visible environmental issue','Observation details','Photograph URL','Consent','Review status','Request digest'];
function setup() {
  const properties = PropertiesService.getScriptProperties();
  properties.setProperty('SHEET_ID', SHEET_ID);
  const book = SpreadsheetApp.openById(SHEET_ID);
  const sheet = book.getSheetByName(TAB_NAME);
  if (!sheet) throw new Error('IAS reports tab is missing.');
  sheet.getRange(1,1,1,HEADERS.length).setValues([HEADERS]);
  sheet.setFrozenRows(1);
  if (!properties.getProperty('PHOTO_FOLDER_ID')) properties.setProperty('PHOTO_FOLDER_ID', DriveApp.createFolder('IAS Watch report photographs').getId());
  console.log('Your response spreadsheet: '+book.getUrl());
  console.log('Storage is ready. Deploy as a web app, executing as you, with access set to Anyone.');
}
function doGet() { return json_({service:'IAS Watch reports',ready:!!PropertiesService.getScriptProperties().getProperty('SHEET_ID')}); }
function doPost(e) {
  const lock = LockService.getScriptLock(); let file;
  try {
    if (!e || !e.postData || e.postData.contents.length > 7200000) throw new Error('Invalid or oversized report.');
    const p = JSON.parse(e.postData.contents);
    if (!/^[a-f0-9-]{36}$/i.test(p.requestId || '')) throw new Error('Invalid report reference.');
    ['species','basin','observedDate'].forEach(k=>{if(typeof p[k]!=='string'||!p[k].trim()||p[k].length>200)throw new Error('Missing or invalid '+k);});
    if(!['Attanagalu Oya Basin','Kelani Basin','Kalu Basin','Not sure'].includes(p.basin)) throw new Error('Invalid basin.');
    if(typeof p.latitude!=='number'||!isFinite(p.latitude)||Math.abs(p.latitude)>90||typeof p.longitude!=='number'||!isFinite(p.longitude)||Math.abs(p.longitude)>180)throw new Error('Invalid coordinates.');
    if(!/^\d{4}-\d{2}-\d{2}$/.test(p.observedDate)||isNaN(Date.parse(p.observedDate))||Date.parse(p.observedDate)>Date.now()+86400000)throw new Error('Invalid observation date.');
    ['abundance','habitat','degradation','notes'].forEach(k=>{if(p[k]!=null&&(typeof p[k]!=='string'||p[k].length>3000))throw new Error('Invalid '+k);});
    let bytes;
    if(p.photo){
      if(!['image/jpeg','image/png','image/webp'].includes(p.photo.mimeType)||typeof p.photo.base64!=='string')throw new Error('Unsupported photograph.');
      bytes=Utilities.base64Decode(p.photo.base64);
      if(bytes.length>5*1024*1024||bytes.length<12)throw new Error('Photograph must be at most 5 MB.');
      const b=bytes.map(n=>n&255),m=p.photo.mimeType;
      if(!((m==='image/jpeg'&&b[0]===255&&b[1]===216&&b[2]===255)||(m==='image/png'&&b.slice(0,8).join(',')==='137,80,78,71,13,10,26,10')||(m==='image/webp'&&String.fromCharCode.apply(null,b.slice(0,4))==='RIFF'&&String.fromCharCode.apply(null,b.slice(8,12))==='WEBP')))throw new Error('Invalid image content.');
    }
    const digest=Utilities.base64Encode(Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256,JSON.stringify(p)));
    lock.waitLock(20000);
    const properties=PropertiesService.getScriptProperties(),id=properties.getProperty('SHEET_ID');
    if(!id)throw new Error('Storage setup is incomplete.');
    const sheet=SpreadsheetApp.openById(id).getSheetByName(TAB_NAME);
    if(!sheet)throw new Error('Report storage tab is missing.');
    if(sheet.getLastRow()>1){
      const previous=sheet.getRange(2,2,sheet.getLastRow()-1,1).createTextFinder(p.requestId).matchEntireCell(true).findNext();
      if(previous){if(sheet.getRange(previous.getRow(),15).getValue()!==digest)throw new Error('This report reference was already used with different content.');return json_({ok:true,requestId:p.requestId});}
    }
    if(bytes){
      const extension={'image/jpeg':'jpg','image/png':'png','image/webp':'webp'}[p.photo.mimeType];
      file=DriveApp.getFolderById(properties.getProperty('PHOTO_FOLDER_ID')).createFile(Utilities.newBlob(bytes,p.photo.mimeType,p.requestId+'.'+extension));
    }
    const row=[new Date(),p.requestId,safe_(p.species),safe_(p.basin),p.latitude,p.longitude,safe_(p.observedDate),safe_(p.abundance),safe_(p.habitat),safe_(p.degradation),safe_(p.notes),file?file.getUrl():'','Agreed','Pending review',digest];
    sheet.appendRow(row);SpreadsheetApp.flush();file=null;
    return json_({ok:true,requestId:p.requestId});
  } catch(error) {
    if(file)try{file.setTrashed(true);}catch(ignored){}
    console.error(error);
    return json_({ok:false,error:'Report could not be saved. Check your fields or try again later.'});
  } finally {if(lock.hasLock())lock.releaseLock();}
}
function safe_(value){const s=String(value||'');return /^[\s]*[=+\-@]/.test(s)?"'"+s:s;}
function json_(value){return ContentService.createTextOutput(JSON.stringify(value)).setMimeType(ContentService.MimeType.JSON);}
