const {onRequest,onCall}=require("firebase-functions/v2/https");
const {functionSecrets,inquiryFunctionSecrets,proposalFunctionSecrets,aiFunctionSecrets,portalOtpMailSecrets}=require("./secrets");

let impl;
function loadImpl(){
  if(!impl)impl=require("./impl");
  return impl;
}

exports.portalShare=onRequest({
  region:"europe-west1",
  secrets:functionSecrets(),
  cors:false
},(req,res)=>loadImpl().portalShare(req,res));

exports.portalDocument=onRequest({
  region:"europe-west1",
  secrets:functionSecrets(),
  cors:false
},(req,res)=>loadImpl().portalDocument(req,res));

exports.createPortalShare=onCall({
  region:"europe-west1",
  secrets:functionSecrets()
},(request)=>loadImpl().createPortalShare(request));

exports.refreshPortalShares=onCall({
  region:"europe-west1",
  secrets:functionSecrets()
},(request)=>loadImpl().refreshPortalShares(request));

exports.revokePortalShare=onCall({
  region:"europe-west1"
},(request)=>loadImpl().revokePortalShare(request));

exports.createCustomerPortalAccess=onCall({
  region:"europe-west1",
  cors:true,
  invoker:"public"
},(request)=>loadImpl().createCustomerPortalAccess(request));

exports.getCustomerPortalContext=onCall({
  region:"europe-west1",
  cors:true,
  invoker:"public"
},(request)=>loadImpl().getCustomerPortalContext(request));

exports.submitCustomerWishRequest=onCall({
  region:"europe-west1",
  cors:true,
  invoker:"public"
},(request)=>loadImpl().submitCustomerWishRequest(request));

exports.listCustomerPortalWishes=onCall({
  region:"europe-west1",
  cors:true,
  invoker:"public"
},(request)=>loadImpl().listCustomerPortalWishes(request));

exports.sendCustomerWishProposal=onCall({
  region:"europe-west1",
  cors:true,
  invoker:"public"
},(request)=>loadImpl().sendCustomerWishProposal(request));

exports.markCustomerWishProposalTransmitted=onCall({
  region:"europe-west1",
  cors:true,
  invoker:"public"
},(request)=>loadImpl().markCustomerWishProposalTransmitted(request));

exports.submitCustomerWishFollowUpAnswers=onCall({
  region:"europe-west1",
  cors:true,
  invoker:"public"
},(request)=>loadImpl().submitCustomerWishFollowUpAnswers(request));

exports.disableCustomerPortalAccess=onCall({
  region:"europe-west1",
  cors:true,
  invoker:"public"
},(request)=>loadImpl().disableCustomerPortalAccess(request));

exports.getCustomerPortalAccessAdmin=onCall({
  region:"europe-west1",
  cors:true,
  invoker:"public"
},(request)=>loadImpl().getCustomerPortalAccessAdmin(request));

exports.requestCustomerPortalOtp=onCall({
  region:"europe-west1",
  cors:true,
  invoker:"public",
  secrets:portalOtpMailSecrets()
},(request)=>loadImpl().requestCustomerPortalOtp(request));

exports.exchangePortalOtpForCustomToken=onCall({
  region:"europe-west1",
  cors:true,
  invoker:"public",
  secrets:functionSecrets()
},(request)=>loadImpl().exchangePortalOtpForAuthToken(request));

exports.analyzeConciergeTrip=onCall({
  region:"europe-west1",
  cors:true,
  invoker:"public",
  secrets:aiFunctionSecrets(),
  timeoutSeconds:30,
  memory:"512MiB"
},(request)=>loadImpl().analyzeConciergeTrip(request));

exports.saveConciergeAnalysis=onCall({
  region:"europe-west1",
  cors:true,
  invoker:"public"
},(request)=>loadImpl().saveConciergeAnalysis(request));

exports.listConciergeAnalyses=onCall({
  region:"europe-west1",
  cors:true,
  invoker:"public"
},(request)=>loadImpl().listConciergeAnalyses(request));

exports.updateConciergeAnalysisItemStatus=onCall({
  region:"europe-west1",
  cors:true,
  invoker:"public"
},(request)=>loadImpl().updateConciergeAnalysisItemStatus(request));

exports.updateConciergeAnalysisTaskAction=onCall({
  region:"europe-west1",
  cors:true,
  invoker:"public"
},(request)=>loadImpl().updateConciergeAnalysisTaskAction(request));

exports.listConciergeAnalysisTasks=onCall({
  region:"europe-west1",
  cors:true,
  invoker:"public"
},(request)=>loadImpl().listConciergeAnalysisTasks(request));

exports.createConciergeAnalysisTask=onCall({
  region:"europe-west1",
  cors:true,
  invoker:"public"
},(request)=>loadImpl().createConciergeAnalysisTask(request));

exports.createCustomerInquiryGrant=onCall({
  region:"europe-west1",
  cors:true,
  invoker:"public",
  secrets:inquiryFunctionSecrets()
},(request)=>loadImpl().createCustomerInquiryGrant(request));

exports.rotateCustomerInquiryGrant=onCall({
  region:"europe-west1",
  cors:true,
  invoker:"public",
  secrets:inquiryFunctionSecrets()
},(request)=>loadImpl().rotateCustomerInquiryGrant(request));

exports.revokeCustomerInquiryGrant=onCall({
  region:"europe-west1",
  cors:true,
  invoker:"public"
},(request)=>loadImpl().revokeCustomerInquiryGrant(request));

exports.getCustomerInquiryGrantStatus=onCall({
  region:"europe-west1",
  cors:true,
  invoker:"public"
},(request)=>loadImpl().getCustomerInquiryGrantStatus(request));

exports.convertProspectToCustomer=onCall({
  region:"europe-west1",
  cors:true,
  invoker:"public"
},(request)=>loadImpl().convertProspectToCustomer(request));

exports.getCustomerInquiryWish=onCall({
  region:"europe-west1",
  cors:true,
  invoker:"public",
  secrets:inquiryFunctionSecrets()
},(request)=>loadImpl().getCustomerInquiryWish(request));

exports.submitCustomerInquiryAnswers=onCall({
  region:"europe-west1",
  cors:true,
  invoker:"public",
  secrets:inquiryFunctionSecrets()
},(request)=>loadImpl().submitCustomerInquiryAnswers(request));

exports.createCustomerProposalGrant=onCall({
  region:"europe-west1",
  cors:true,
  invoker:"public",
  secrets:proposalFunctionSecrets()
},(request)=>loadImpl().createCustomerProposalGrant(request));

exports.rotateCustomerProposalGrant=onCall({
  region:"europe-west1",
  cors:true,
  invoker:"public",
  secrets:proposalFunctionSecrets()
},(request)=>loadImpl().rotateCustomerProposalGrant(request));

exports.revokeCustomerProposalGrant=onCall({
  region:"europe-west1",
  cors:true,
  invoker:"public"
},(request)=>loadImpl().revokeCustomerProposalGrant(request));

exports.getCustomerProposalGrantStatus=onCall({
  region:"europe-west1",
  cors:true,
  invoker:"public"
},(request)=>loadImpl().getCustomerProposalGrantStatus(request));

exports.getCustomerProposalByToken=onCall({
  region:"europe-west1",
  cors:true,
  invoker:"public",
  secrets:proposalFunctionSecrets()
},(request)=>loadImpl().getCustomerProposalByToken(request));
