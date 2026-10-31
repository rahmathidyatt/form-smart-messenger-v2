/** Run in editor. Read-only: no submission, no email, no secret/token logging. */
function diagnoseWebsiteIntegration() {
 const report={submitted:false};
 try {report.timeZone=Session.getScriptTimeZone();report.secretLength=prop_('APPS_SCRIPT_SECRET').length;report.emailPolicyApproved=prop_('PUBLIC_EMAIL_POLICY_APPROVED')==='true';
 const f=FormApp.openById(must_('FORM_ID'));report.formId=f.getId();report.acceptingResponses=f.isAcceptingResponses();report.responseCount=f.getResponses().length;
 const rows=records_();report.ledgerCount=rows.length;report.recent=rows.slice(-5).map(r=>({id:r.id,state:r.state,lastCode:r.lastCode,responseId:r.responseId||null}));
 }catch(e){report.localCheckError=e.code||'LOCAL_CHECK_FAILED';}
 try {
 const url='https://script.google.com/macros/s/AKfycbxaBOECPNnQk9hOxKR0Lk3bFe_b5hCerDxpPel7s4-60qP0xVQUZZqPrk1OK_94XEA8/exec';
 const body=JSON.stringify({action:'status',data:{id:Utilities.getUuid(),token:'0'.repeat(64)}}),ts=Date.now(),nonce=Utilities.getUuid();
 const signature=hex_(Utilities.computeHmacSha256Signature(ts+'.'+nonce+'.'+body,must_('APPS_SCRIPT_SECRET'),Utilities.Charset.UTF_8));
 const res=UrlFetchApp.fetch(url,{method:'post',contentType:'application/json',payload:JSON.stringify({ts:ts,nonce:nonce,body:body,signature:signature}),muteHttpExceptions:true,followRedirects:true});
 report.gatewayHttp=res.getResponseCode();
 try{const data=JSON.parse(res.getContentText());report.gatewayCode=data.code||'UNEXPECTED';report.gatewayReachable=data.ok===false&&data.code==='NOT_FOUND';}catch{report.gatewayCode='NON_JSON_RESPONSE';}
 }catch(e){report.gatewayCode=e.code||'CONNECTION_FAILED';}
 console.log(JSON.stringify(report,null,2));
}
