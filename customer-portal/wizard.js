(function(){
  "use strict";

  const DRAFT_KEY="act_concierge_wizard_draft";
  const TOTAL_STEPS=9;

  const STEPS=[
    {id:"customer",label:"Kunde",title:"Kundendaten",help:"Erfassen Sie die Kontaktdaten des neuen Concierge-Kunden. Mindestens Telefon oder E-Mail ist erforderlich."},
    {id:"travel",label:"Reise",title:"Reise",help:"Reisezeitraum, Region und Unterkunft legen die Grundlage für Programm und Angebot."},
    {id:"wishes",label:"Wünsche",title:"Concierge-Wünsche",help:"Die Wünsche helfen bei der Auswahl passender Erlebnisse und werden intern gespeichert."},
    {id:"budget",label:"Budget",title:"Budget",help:"Das Budget dient ausschließlich zur Auswahl passender Vorschläge und wird nicht veröffentlicht."},
    {id:"program",label:"Programm",title:"Programmpunkte",help:"Optional können erste Programmpunkte angelegt werden. Eine Veröffentlichung erfolgt erst später."},
    {id:"documents",label:"Dokumente",title:"Dokumente",help:"Tickets, Voucher und PDFs können bereits beim Anlegen hochgeladen werden."},
    {id:"offer",label:"Angebot",title:"Angebot",help:"Eine Angebotsübersicht wird automatisch erstellt. Der Versand erfolgt erst in einem späteren Schritt."},
    {id:"portal",label:"Portal",title:"Kundenportal",help:"Legen Sie fest, welche Inhalte später im Kundenportal sichtbar sein sollen."},
    {id:"communication",label:"Kommunikation",title:"Kommunikation",help:"Wählen Sie die gewünschten Kommunikationskanäle für Angebot und Portal."}
  ];

  const WISH_OPTIONS=[
    "Erleben & Entdecken","Genuss & Kulinarik","Wellness","Familie","Sport",
    "Natur","Kultur","Shopping","Transfers","Business","Exklusive Services"
  ];

  const BUDGET_OPTIONS=[
    {value:"offen",label:"Offen",hint:"Noch nicht festgelegt"},
    {value:"bis-500",label:"Bis 500 €",hint:"Einstiegsbudget"},
    {value:"500-1000",label:"500 – 1.000 €",hint:"Komfortbereich"},
    {value:"1000-3000",label:"1.000 – 3.000 €",hint:"Erweitertes Programm"},
    {value:"premium",label:"Premium",hint:"Exklusive Erlebnisse"},
    {value:"custom",label:"Eigenes Budget",hint:"Individuelle Angabe"}
  ];

  const PROGRAM_CATEGORIES=[
    "Aktivität","Restaurant","Wellness","Kultur","Sport","Transfer","Concierge-Service","Sonstiges"
  ];

  const WORKFLOW_STEPS=[
    "Anfrage","Angebot","Zahlung","Programm","Portal","Reise","Abgeschlossen"
  ];

  let bridge=null;
  let state=defaultState();
  let saveTimer=null;
  let rootEl=null;

  function defaultState(){
    return {
      step:0,
      data:defaultDraftData(),
      showProgramForm:false,
      showComplete:false
    };
  }

  function defaultDraftData(){
    return {
      firstName:"",
      lastName:"",
      language:"Deutsch",
      phone:"",
      whatsapp:"",
      email:"",
      nationality:"",
      residence:"",
      remarks:"",
      region:"",
      hotel:"",
      arrival:"",
      departure:"",
      adults:"2",
      children:"0",
      childrenAges:"",
      wishes:[],
      wishesText:"",
      budget:"offen",
      budgetCustom:"",
      program:[],
      documents:[],
      portal:{
        publishPortal:false,
        weather:true,
        publishDocuments:false,
        publishProgram:false
      },
      communication:{
        emailOffer:false,
        whatsapp:false,
        qrCode:false,
        reminders:false
      }
    };
  }

  function byId(id){
    return document.getElementById(id);
  }

  function escapeHtml(value){
    return String(value??"")
      .replace(/&/g,"&amp;")
      .replace(/</g,"&lt;")
      .replace(/>/g,"&gt;")
      .replace(/"/g,"&quot;");
  }

  function init(api){
    bridge=api||{};
    rootEl=byId("conciergeWizard");
    bindEvents();
    tryRestoreDraftOnLoad();
  }

  function bindEvents(){
    byId("wizardBackButton")?.addEventListener("click",goBack);
    byId("wizardNextButton")?.addEventListener("click",goNext);
    byId("wizardSaveButton")?.addEventListener("click",()=>saveDraft(true));
    byId("wizardCancelButton")?.addEventListener("click",cancelWizard);
    byId("wizardCompleteButton")?.addEventListener("click",completeWizard);
    byId("wizardPrintOfferButton")?.addEventListener("click",printOffer);

    rootEl?.addEventListener("input",onWizardInput);
    rootEl?.addEventListener("change",onWizardChange);
    rootEl?.addEventListener("click",onWizardClick);
  }

  function onWizardInput(event){
    const field=event.target.closest("[data-wizard-field]");
    if(!field)return;
    const key=field.dataset.wizardField;
    if(!key)return;
    state.data[key]=field.type==="checkbox"?field.checked:field.value;
    scheduleDraftSave();
    if(state.step===1)updateTravelDuration();
    if(state.step===6)renderOfferPreview();
  }

  function onWizardChange(event){
    if(event.target.matches("[data-wizard-wish]")){
      const value=event.target.value;
      const wishes=new Set(state.data.wishes);
      if(event.target.checked)wishes.add(value);
      else wishes.delete(value);
      state.data.wishes=[...wishes];
      scheduleDraftSave();
      render();
      return;
    }
    if(event.target.matches("[data-wizard-budget]")){
      state.data.budget=event.target.value;
      scheduleDraftSave();
      render();
      return;
    }
    if(event.target.matches("[data-wizard-portal]")){
      state.data.portal[event.target.dataset.wizardPortal]=event.target.checked;
      scheduleDraftSave();
      return;
    }
    if(event.target.matches("[data-wizard-comm]")){
      state.data.communication[event.target.dataset.wizardComm]=event.target.checked;
      scheduleDraftSave();
      return;
    }
    if(event.target.matches("#wizardDocumentInput")){
      handleDocumentUpload(event.target.files);
      event.target.value="";
    }
  }

  function onWizardClick(event){
    if(event.target.closest("#wizardAddProgramButton")){
      state.showProgramForm=true;
      render();
      return;
    }
    if(event.target.closest("#wizardConfirmProgramButton")){
      addProgramItem();
      return;
    }
    if(event.target.closest("[data-remove-program]")){
      const index=Number(event.target.closest("[data-remove-program]").dataset.removeProgram);
      state.data.program.splice(index,1);
      scheduleDraftSave();
      render();
      return;
    }
    if(event.target.closest("[data-remove-document]")){
      const index=Number(event.target.closest("[data-remove-document]").dataset.removeDocument);
      state.data.documents.splice(index,1);
      scheduleDraftSave();
      render();
      return;
    }
    if(event.target.closest("#wizardUploadTrigger")){
      byId("wizardDocumentInput")?.click();
    }
  }

  function scheduleDraftSave(){
    window.clearTimeout(saveTimer);
    saveTimer=window.setTimeout(()=>saveDraft(false),700);
    updateDraftBadge(true);
  }

  function saveDraft(showFeedback){
    try{
      localStorage.setItem(DRAFT_KEY,JSON.stringify({
        savedAt:new Date().toISOString(),
        step:state.step,
        data:state.data
      }));
      updateDraftBadge(true);
      if(showFeedback){
        const hint=byId("wizardDraftHint");
        if(hint){
          hint.textContent="Entwurf gespeichert um "+new Date().toLocaleTimeString("de-DE",{hour:"2-digit",minute:"2-digit"});
          window.setTimeout(()=>{if(hint)hint.textContent=""},2400);
        }
      }
    }catch(error){
      console.warn("[ACT Wizard] Entwurf speichern:",error&&error.message?error.message:"Fehler");
    }
  }

  function loadDraft(){
    try{
      const raw=localStorage.getItem(DRAFT_KEY);
      if(!raw)return null;
      const parsed=JSON.parse(raw);
      if(!parsed||!parsed.data)return null;
      return parsed;
    }catch(error){
      return null;
    }
  }

  function clearDraft(){
    localStorage.removeItem(DRAFT_KEY);
    updateDraftBadge(false);
  }

  function tryRestoreDraftOnLoad(){
    const draft=loadDraft();
    if(!draft)return;
    updateDraftBadge(true);
  }

  function updateDraftBadge(hasDraft){
    const badge=byId("wizardDraftBadge");
    if(badge)badge.hidden=!hasDraft;
  }

  function open(){
    const draft=loadDraft();
    if(draft&&draft.data){
      const restore=window.confirm("Es gibt einen gespeicherten Wizard-Entwurf. Möchten Sie fortfahren?");
      if(restore){
        state.step=Math.min(Math.max(0,draft.step||0),TOTAL_STEPS-1);
        state.data={...defaultDraftData(),...draft.data};
        state.showProgramForm=false;
        state.showComplete=false;
      }else{
        clearDraft();
        state=defaultState();
      }
    }else{
      state=defaultState();
    }
    if(rootEl)rootEl.hidden=false;
    document.body.style.overflow="hidden";
    render();
  }

  function close(){
    if(rootEl)rootEl.hidden=true;
    document.body.style.overflow="";
  }

  function cancelWizard(){
    if(state.step>0||hasAnyData()){
      if(!window.confirm("Wizard wirklich abbrechen? Der Entwurf bleibt lokal gespeichert."))return;
    }
    close();
  }

  function hasAnyData(){
    const d=state.data;
    return !!(d.firstName||d.lastName||d.email||d.phone||d.region||d.program.length||d.documents.length);
  }

  function goBack(){
    hideValidation();
    if(state.step<=0)return;
    readCurrentStepFields();
    state.step-=1;
    state.showProgramForm=false;
    saveDraft(false);
    render();
  }

  function goNext(){
    hideValidation();
    readCurrentStepFields();
    const errors=validateStep(state.step);
    if(errors.length){
      showValidation(errors);
      return;
    }
    if(state.step>=TOTAL_STEPS-1){
      state.showComplete=true;
      render();
      return;
    }
    state.step+=1;
    saveDraft(false);
    render();
  }

  function readCurrentStepFields(){
    rootEl?.querySelectorAll("[data-wizard-field]").forEach(field=>{
      const key=field.dataset.wizardField;
      if(!key)return;
      state.data[key]=field.type==="checkbox"?field.checked:field.value;
    });
    if(state.step===4){
      readProgramFormFields();
    }
  }

  function readProgramFormFields(){
    const form=byId("wizardProgramForm");
    if(!form)return;
    state._pendingProgram={
      date:form.elements.date?.value||"",
      title:form.elements.title?.value||"",
      category:form.elements.category?.value||"Concierge-Service",
      startTime:form.elements.startTime?.value||"10:00",
      endTime:form.elements.endTime?.value||"12:00"
    };
  }

  function validateStep(stepIndex){
    const d=state.data;
    const errors=[];
    if(stepIndex===0){
      if(!d.firstName.trim())errors.push("Vorname fehlt.");
      if(!d.lastName.trim())errors.push("Nachname fehlt.");
      if(!d.language.trim())errors.push("Sprache fehlt.");
      if(!d.phone.trim()&&!d.whatsapp.trim()&&!d.email.trim()){
        errors.push("Telefonnummer oder E-Mail fehlt.");
        errors.push("Ohne Kontaktmöglichkeit kann kein Angebot versendet werden.");
      }
    }
    if(stepIndex===1){
      if(!d.region.trim())errors.push("Region fehlt.");
      if(!d.arrival)errors.push("Anreisedatum fehlt.");
      if(!d.departure)errors.push("Abreisedatum fehlt.");
      if(d.arrival&&d.departure&&d.departure<d.arrival)errors.push("Abreise muss nach der Anreise liegen.");
    }
    if(stepIndex===3&&d.budget==="custom"&&!d.budgetCustom.trim()){
      errors.push("Bitte ein eigenes Budget eingeben oder eine andere Option wählen.");
    }
    return errors;
  }

  function showValidation(errors){
    const box=byId("wizardValidation");
    if(!box)return;
    box.hidden=false;
    box.innerHTML=errors.map(msg=>`<div class="wizard-validation-item">${escapeHtml(msg)}</div>`).join("");
  }

  function hideValidation(){
    const box=byId("wizardValidation");
    if(box){box.hidden=true;box.innerHTML=""}
  }

  function travelDays(){
    const d=state.data;
    if(!d.arrival||!d.departure)return 0;
    const start=new Date(d.arrival);
    const end=new Date(d.departure);
    if(Number.isNaN(start)||Number.isNaN(end))return 0;
    return Math.max(1,Math.round((end-start)/86400000)+1);
  }

  function updateTravelDuration(){
    const el=byId("wizardTravelDuration");
    if(!el)return;
    const days=travelDays();
    el.textContent=days?`${days} Tage`:"–";
  }

  function customerDisplayName(){
    const d=state.data;
    const name=`${d.firstName} ${d.lastName}`.trim();
    return name||"Neuer Concierge-Auftrag";
  }

  function progressPercent(){
    return Math.round(((state.step+1)/TOTAL_STEPS)*100);
  }

  function render(){
    if(!rootEl)return;
    renderHeader();
    renderSidebar();
    renderStepContent();
    renderFooter();
  }

  function renderHeader(){
    const title=byId("wizardTitle");
    const customer=byId("wizardCustomerLabel");
    const stepLabel=byId("wizardStepLabel");
    const pct=byId("wizardProgressPct");
    const fill=byId("wizardProgressFill");
    if(title)title.textContent=state.showComplete?"Auftrag abschließen":STEPS[state.step].title;
    if(customer)customer.textContent=customerDisplayName();
    if(stepLabel)stepLabel.textContent=state.showComplete?"Abschluss":`Schritt ${state.step+1} von ${TOTAL_STEPS}`;
    const percent=state.showComplete?100:progressPercent();
    if(pct)pct.textContent=`${percent} %`;
    if(fill)fill.style.width=`${percent}%`;
  }

  function renderSidebar(){
    const list=byId("wizardChecklist");
    if(!list)return;
    list.innerHTML=STEPS.map((step,index)=>{
      let cls="is-pending";
      let icon="○";
      if(index<state.step||(state.showComplete&&index<TOTAL_STEPS)){
        cls="is-done";
        icon="✓";
      }else if(index===state.step&&!state.showComplete){
        cls="is-active";
        icon=String(index+1);
      }
      return `<li class="${cls}"><span class="wizard-checklist-icon">${icon}</span>${escapeHtml(step.label)}</li>`;
    }).join("");
    renderWorkflowDash();
  }

  function renderWorkflowDash(){
    const dash=byId("wizardWorkflowDash");
    if(!dash)return;
    const show=state.showComplete||state.step>=6;
    dash.hidden=!show;
    if(!show)return;
    const currentIndex=state.showComplete?1:0;
    dash.innerHTML=`
      <h4>Workflow</h4>
      <div class="wizard-workflow-steps">
        ${WORKFLOW_STEPS.map((label,index)=>{
          let cls=index<currentIndex?"is-done":index===currentIndex?"is-current":"";
          const mark=index<currentIndex?"✓":index===currentIndex?"●":"○";
          return `<div class="wizard-workflow-step ${cls}"><span>${mark}</span>${escapeHtml(label)}</div>`;
        }).join("")}
      </div>`;
  }

  function renderStepContent(){
    const main=byId("wizardStepContent");
    if(!main)return;
    if(state.showComplete){
      main.innerHTML=renderCompleteStep();
      return;
    }
    const step=STEPS[state.step];
    const renderers={
      0:renderCustomerStep,
      1:renderTravelStep,
      2:renderWishesStep,
      3:renderBudgetStep,
      4:renderProgramStep,
      5:renderDocumentsStep,
      6:renderOfferStep,
      7:renderPortalStep,
      8:renderCommunicationStep
    };
    const body=(renderers[state.step]||renderCustomerStep)();
    main.innerHTML=`
      <div class="wizard-card">
        <div class="wizard-help"><strong>${escapeHtml(step.title)}</strong>${escapeHtml(step.help)}</div>
        <div class="wizard-validation" id="wizardValidation" hidden></div>
        ${body}
      </div>`;
    if(state.step===1)updateTravelDuration();
    if(state.step===6)renderOfferPreview();
  }

  function renderFooter(){
    const back=byId("wizardBackButton");
    const next=byId("wizardNextButton");
    const complete=byId("wizardCompleteButton");
    const hint=byId("wizardFooterHint");
    if(back){
      back.hidden=state.showComplete;
      back.disabled=state.step<=0&&!state.showComplete;
    }
    if(next)next.hidden=state.showComplete;
    if(complete)complete.hidden=!state.showComplete;
    if(hint){
      hint.textContent=state.showComplete
        ? "Der Kunde wird mit Status „Anfrage eingegangen“ angelegt."
        : state.step===TOTAL_STEPS-1?"Letzter Schritt – danach Abschluss.":"";
    }
    if(next)next.textContent=state.step===TOTAL_STEPS-1?"Zum Abschluss":"Weiter";
  }

  function fieldInput(key,label,value,type="text",required=false,options=null){
    const req=required?'<span class="req">*</span>':"";
    if(type==="select"&&options){
      const opts=options.map(opt=>{
        const val=typeof opt==="string"?opt:opt.value;
        const text=typeof opt==="string"?opt:opt.label;
        const sel=String(value)===String(val)?" selected":"";
        return `<option value="${escapeHtml(val)}"${sel}>${escapeHtml(text)}</option>`;
      }).join("");
      return `<div class="wizard-field"><label>${escapeHtml(label)}${req}</label><select data-wizard-field="${key}">${opts}</select></div>`;
    }
    if(type==="textarea"){
      return `<div class="wizard-field"><label>${escapeHtml(label)}${req}</label><textarea data-wizard-field="${key}" rows="3">${escapeHtml(value)}</textarea></div>`;
    }
    const inputType=type==="date"?"date":type==="email"?"email":"text";
    return `<div class="wizard-field"><label>${escapeHtml(label)}${req}</label><input type="${inputType}" data-wizard-field="${key}" value="${escapeHtml(value)}"></div>`;
  }

  function renderCustomerStep(){
    const d=state.data;
    const languages=bridge.languages||["Deutsch","Englisch","Französisch","Italienisch"];
    return `<div class="wizard-field-grid cols-2">
      ${fieldInput("firstName","Vorname",d.firstName,"text",true)}
      ${fieldInput("lastName","Nachname",d.lastName,"text",true)}
      ${fieldInput("language","Sprache",d.language,"select",true,languages)}
      ${fieldInput("phone","Telefon",d.phone)}
      ${fieldInput("whatsapp","WhatsApp",d.whatsapp)}
      ${fieldInput("email","E-Mail",d.email,"email")}
      ${fieldInput("nationality","Nationalität",d.nationality)}
      ${fieldInput("residence","Wohnort",d.residence)}
      <div class="wizard-field" style="grid-column:1/-1">${fieldInput("remarks","Bemerkungen",d.remarks,"textarea")}</div>
    </div>`;
  }

  function renderTravelStep(){
    const d=state.data;
    const regions=bridge.regions||["Ganz Tirol","Innsbruck","Kitzbühel","Zillertal"];
    const regionOptions=[{value:"",label:"Bitte wählen"},...regions.map(r=>({value:r,label:r}))];
    return `<div class="wizard-field-grid cols-2">
      ${fieldInput("region","Region",d.region,"select",true,regionOptions)}
      ${fieldInput("hotel","Unterkunft / Hotel",d.hotel)}
      ${fieldInput("arrival","Anreise",d.arrival,"date",true)}
      ${fieldInput("departure","Abreise",d.departure,"date",true)}
      ${fieldInput("adults","Erwachsene",d.adults)}
      ${fieldInput("children","Kinder",d.children)}
      <div class="wizard-field" style="grid-column:1/-1">${fieldInput("childrenAges","Alter der Kinder",d.childrenAges)}</div>
      <div class="wizard-field" style="grid-column:1/-1">
        <label>Reisedauer</label>
        <span class="wizard-inline-stat" id="wizardTravelDuration">–</span>
      </div>
    </div>`;
  }

  function renderWishesStep(){
    const d=state.data;
    const pills=WISH_OPTIONS.map(wish=>{
      const checked=d.wishes.includes(wish);
      return `<label class="wizard-choice-pill${checked?" is-selected":""}">
        <input type="checkbox" data-wizard-wish value="${escapeHtml(wish)}"${checked?" checked":""}>
        <span class="wizard-option-indicator" aria-hidden="true"></span>
        <span>${escapeHtml(wish)}</span>
      </label>`;
    }).join("");
    return `
      <div class="wizard-choice-grid">${pills}</div>
      <div class="wizard-field" style="margin-top:18px">
        ${fieldInput("wishesText","Beschreiben Sie die Wünsche des Kunden",d.wishesText,"textarea")}
      </div>`;
  }

  function renderBudgetStep(){
    const d=state.data;
    const radios=BUDGET_OPTIONS.map(opt=>{
      const selected=d.budget===opt.value;
      return `<label class="wizard-radio-option${selected?" is-selected":""}">
        <input type="radio" name="wizardBudget" data-wizard-budget value="${escapeHtml(opt.value)}"${selected?" checked":""}>
        <span class="wizard-option-indicator" aria-hidden="true"></span>
        <span>
          <span class="wizard-option-label-main">${escapeHtml(opt.label)}</span>
          ${opt.hint?`<span class="wizard-option-label-sub">${escapeHtml(opt.hint)}</span>`:""}
        </span>
      </label>`;
    }).join("");
    const customHidden=d.budget!=="custom"?" hidden":"";
    return `
      <div class="wizard-radio-grid">${radios}</div>
      <div class="wizard-field${customHidden?"":" is-invalid"}" id="wizardBudgetCustomField" style="margin-top:16px"${customHidden?" hidden":""}>
        ${fieldInput("budgetCustom","Eigenes Budget",d.budgetCustom)}
      </div>`;
  }

  function renderProgramStep(){
    const d=state.data;
    const list=d.program.length?d.program.map((item,index)=>`
      <div class="wizard-list-item">
        <div class="wizard-list-item-head">
          <strong>${escapeHtml(item.title||"Programmpunkt")}</strong>
          <button class="button soft" type="button" data-remove-program="${index}">Entfernen</button>
        </div>
        <div class="wizard-list-item-meta">${escapeHtml(item.date||"–")} · ${escapeHtml(item.startTime||"")}–${escapeHtml(item.endTime||"")} · ${escapeHtml(item.category||"")}</div>
      </div>`).join(""):'<div class="wizard-empty">Noch keine Programmpunkte. Optional können Sie welche hinzufügen.</div>';
    const form=state.showProgramForm?`
      <form class="wizard-add-form" id="wizardProgramForm">
        <div class="wizard-field-grid cols-2">
          <div class="wizard-field"><label>Datum</label><input type="date" name="date" value="${escapeHtml(state._pendingProgram?.date||d.arrival)}"></div>
          <div class="wizard-field"><label>Titel<span class="req">*</span></label><input type="text" name="title" value="${escapeHtml(state._pendingProgram?.title||"")}"></div>
          <div class="wizard-field"><label>Kategorie</label><select name="category">${PROGRAM_CATEGORIES.map(cat=>`<option${(state._pendingProgram?.category||"Concierge-Service")===cat?" selected":""}>${escapeHtml(cat)}</option>`).join("")}</select></div>
          <div class="wizard-field"><label>Beginn</label><input type="text" name="startTime" value="${escapeHtml(state._pendingProgram?.startTime||"10:00")}"></div>
          <div class="wizard-field"><label>Ende</label><input type="text" name="endTime" value="${escapeHtml(state._pendingProgram?.endTime||"12:00")}"></div>
        </div>
        <div class="wizard-footer-actions">
          <button class="button primary" type="button" id="wizardConfirmProgramButton">Programmpunkt übernehmen</button>
        </div>
      </form>`:"";
    return `
      <div class="wizard-list">${list}</div>
      <button class="button soft" type="button" id="wizardAddProgramButton" style="margin-top:14px">+ Programmpunkt hinzufügen</button>
      ${form}`;
  }

  function addProgramItem(){
    readProgramFormFields();
    const p=state._pendingProgram||{};
    if(!p.title?.trim()){
      showValidation(["Bitte einen Titel für den Programmpunkt eingeben."]);
      return;
    }
    state.data.program.push({
      id:`item-${Date.now()}`,
      date:p.date||state.data.arrival||"",
      dateValue:p.date||state.data.arrival||"",
      startTime:p.startTime||"10:00",
      endTime:p.endTime||"12:00",
      title:p.title.trim(),
      shortDescription:"",
      description:"",
      category:p.category||"Concierge-Service",
      meetingPoint:"",
      address:"",
      navigationUrl:"",
      outfit:"",
      notes:"",
      contactPerson:"",
      phone:"",
      status:"In Planung",
      calendarEnabled:true,
      colorClass:"type-concierge",
      images:[],
      documents:[]
    });
    state.showProgramForm=false;
    state._pendingProgram=null;
    scheduleDraftSave();
    hideValidation();
    render();
  }

  function renderDocumentsStep(){
    const d=state.data;
    const list=d.documents.length?d.documents.map((doc,index)=>`
      <div class="wizard-list-item">
        <div class="wizard-list-item-head">
          <strong>${escapeHtml(doc.title||doc.fileName||"Dokument")}</strong>
          <button class="button soft" type="button" data-remove-document="${index}">Entfernen</button>
        </div>
        <div class="wizard-list-item-meta">${escapeHtml(doc.type||"Sonstiges")} · ${escapeHtml(doc.fileName||"")}</div>
      </div>`).join(""):"";
    return `
      <div class="wizard-upload-zone" id="wizardUploadTrigger">
        <input type="file" id="wizardDocumentInput" multiple accept=".pdf,image/*,.doc,.docx">
        <strong>Dateien hier ablegen oder klicken</strong>
        <span class="muted">Tickets, Voucher, PDFs, Bilder – Mehrfachupload möglich</span>
      </div>
      ${list?`<div class="wizard-list" style="margin-top:16px">${list}</div>`:""}`;
  }

  async function handleDocumentUpload(fileList){
    if(!fileList||!fileList.length)return;
    for(const file of fileList){
      try{
        const dataUrl=await readFileAsDataUrl(file);
        const type=guessDocumentType(file);
        state.data.documents.push({
          title:file.name.replace(/\.[^.]+$/,""),
          type,
          fileName:file.name,
          contentType:file.type||"",
          dataUrl,
          visible:false,
          note:"Wizard-Upload"
        });
      }catch(error){
        console.warn("[ACT Wizard] Datei lesen:",error&&error.message?error.message:"Fehler");
      }
    }
    scheduleDraftSave();
    render();
  }

  function readFileAsDataUrl(file){
    return new Promise((resolve,reject)=>{
      const reader=new FileReader();
      reader.onload=()=>resolve(reader.result);
      reader.onerror=()=>reject(reader.error);
      reader.readAsDataURL(file);
    });
  }

  function guessDocumentType(file){
    const name=String(file.name||"").toLowerCase();
    if(/ticket|flug|zug/i.test(name))return "Ticket";
    if(/voucher|gutschein/i.test(name))return "Voucher";
    if(/angebot/i.test(name))return "Angebot";
    if(/rechnung/i.test(name))return "Rechnung";
    if(file.type==="application/pdf")return "PDF";
    if(file.type&&file.type.startsWith("image/"))return "Sonstiges";
    return "Sonstiges";
  }

  function buildOfferSummary(){
    const d=state.data;
    const days=travelDays();
    const budgetLabel=(BUDGET_OPTIONS.find(o=>o.value===d.budget)||{}).label||d.budget;
    const budget=d.budget==="custom"?d.budgetCustom:budgetLabel;
    return {
      customer:customerDisplayName(),
      region:d.region,
      period:`${d.arrival||"–"} – ${d.departure||"–"}`,
      days,
      hotel:d.hotel||"–",
      travelers:`${d.adults||0} Erwachsene, ${d.children||0} Kinder`,
      wishes:d.wishes.join(", ")||"–",
      budget,
      programCount:d.program.length,
      documentCount:d.documents.length
    };
  }

  function renderOfferStep(){
    return `
      <div class="wizard-offer-preview" id="wizardOfferPreview"></div>
      <div class="wizard-footer-actions" style="margin-top:16px">
        <button class="button soft" type="button" id="wizardPrintOfferButton">Angebot als PDF drucken</button>
      </div>`;
  }

  function renderOfferPreview(){
    const el=byId("wizardOfferPreview");
    if(!el)return;
    const o=buildOfferSummary();
    el.innerHTML=`
      <h4>Angebotsübersicht (Entwurf)</h4>
      <div class="wizard-offer-row"><span>Kunde</span><strong>${escapeHtml(o.customer)}</strong></div>
      <div class="wizard-offer-row"><span>Region</span><strong>${escapeHtml(o.region)}</strong></div>
      <div class="wizard-offer-row"><span>Zeitraum</span><strong>${escapeHtml(o.period)} (${o.days} Tage)</strong></div>
      <div class="wizard-offer-row"><span>Unterkunft</span><strong>${escapeHtml(o.hotel)}</strong></div>
      <div class="wizard-offer-row"><span>Reisende</span><strong>${escapeHtml(o.travelers)}</strong></div>
      <div class="wizard-offer-row"><span>Wünsche</span><strong>${escapeHtml(o.wishes)}</strong></div>
      <div class="wizard-offer-row"><span>Budget (intern)</span><strong>${escapeHtml(o.budget)}</strong></div>
      <div class="wizard-offer-row"><span>Programmpunkte</span><strong>${o.programCount}</strong></div>
      <div class="wizard-offer-row"><span>Dokumente</span><strong>${o.documentCount}</strong></div>
      <p class="muted" style="margin:8px 0 0">Noch nicht versendet – reine interne Vorschau.</p>`;
  }

  function printOffer(){
    const o=buildOfferSummary();
    const win=window.open("","_blank","noopener");
    if(!win)return;
    win.document.write(`<!doctype html><html lang="de"><head><meta charset="utf-8"><title>Angebot ${escapeHtml(o.customer)}</title>
      <style>body{font-family:Georgia,serif;padding:40px;color:#102820}h1{font-size:28px}table{width:100%;border-collapse:collapse;margin-top:20px}td{padding:10px 0;border-bottom:1px solid #ddd}td:first-child{color:#63746e;width:40%}</style></head><body>
      <h1>Alpine Concierge Tirol – Angebot (Entwurf)</h1>
      <table>
        <tr><td>Kunde</td><td>${escapeHtml(o.customer)}</td></tr>
        <tr><td>Region</td><td>${escapeHtml(o.region)}</td></tr>
        <tr><td>Zeitraum</td><td>${escapeHtml(o.period)} (${o.days} Tage)</td></tr>
        <tr><td>Unterkunft</td><td>${escapeHtml(o.hotel)}</td></tr>
        <tr><td>Reisende</td><td>${escapeHtml(o.travelers)}</td></tr>
        <tr><td>Wünsche</td><td>${escapeHtml(o.wishes)}</td></tr>
        <tr><td>Budget (intern)</td><td>${escapeHtml(o.budget)}</td></tr>
      </table>
      <p style="margin-top:30px;color:#63746e;font-size:13px">Entwurf – nicht versendet. Alpine Concierge Tirol</p>
      </body></html>`);
    win.document.close();
    win.focus();
    win.print();
  }

  function renderPortalStep(){
    const p=state.data.portal;
    const checks=[
      {key:"publishPortal",label:"Kundenportal veröffentlichen"},
      {key:"weather",label:"Wetter aktivieren"},
      {key:"publishDocuments",label:"Dokumente veröffentlichen"},
      {key:"publishProgram",label:"Reiseprogramm veröffentlichen"}
    ];
    return `<div class="wizard-choice-grid">${checks.map(c=>`
      <label class="wizard-choice-pill${p[c.key]?" is-selected":""}">
        <input type="checkbox" data-wizard-portal="${c.key}"${p[c.key]?" checked":""}>
        <span class="wizard-option-indicator" aria-hidden="true"></span>
        <span>${escapeHtml(c.label)}</span>
      </label>`).join("")}</div>`;
  }

  function renderCommunicationStep(){
    const c=state.data.communication;
    const checks=[
      {key:"emailOffer",label:"Angebot per E-Mail"},
      {key:"whatsapp",label:"WhatsApp"},
      {key:"qrCode",label:"QR-Code"},
      {key:"reminders",label:"Erinnerungen aktivieren"}
    ];
    return `<div class="wizard-choice-grid">${checks.map(item=>`
      <label class="wizard-choice-pill${c[item.key]?" is-selected":""}">
        <input type="checkbox" data-wizard-comm="${item.key}"${c[item.key]?" checked":""}>
        <span class="wizard-option-indicator" aria-hidden="true"></span>
        <span>${escapeHtml(item.label)}</span>
      </label>`).join("")}</div>`;
  }

  function renderCompleteStep(){
    const d=state.data;
    return `
      <div class="wizard-help"><strong>Auftrag erstellen</strong>Alle Angaben werden übernommen. Der Kunde erhält den Status „Anfrage eingegangen“. Die Bearbeitungsmaske öffnet sich anschließend automatisch.</div>
      <div class="wizard-offer-preview">
        <div class="wizard-offer-row"><span>Kunde</span><strong>${escapeHtml(customerDisplayName())}</strong></div>
        <div class="wizard-offer-row"><span>Region</span><strong>${escapeHtml(d.region)}</strong></div>
        <div class="wizard-offer-row"><span>Zeitraum</span><strong>${escapeHtml(d.arrival)} – ${escapeHtml(d.departure)}</strong></div>
        <div class="wizard-offer-row"><span>Programmpunkte</span><strong>${d.program.length}</strong></div>
        <div class="wizard-offer-row"><span>Dokumente</span><strong>${d.documents.length}</strong></div>
      </div>
      ${renderWorkflowDashInline()}`;
  }

  function renderWorkflowDashInline(){
    return `
      <div class="wizard-workflow-dash" style="margin-top:20px;border-top:none;padding-top:0">
        <h4>Workflow-Dashboard</h4>
        <div class="wizard-workflow-steps">
          ${WORKFLOW_STEPS.map((label,index)=>{
            const cls=index===0?"is-done":index===1?"is-current":"";
            const mark=index===0?"✓":index===1?"●":"○";
            return `<div class="wizard-workflow-step ${cls}"><span>${mark}</span>${escapeHtml(label)}</div>`;
          }).join("")}
        </div>
      </div>`;
  }

  function completeWizard(){
    readCurrentStepFields();
    const errors=validateStep(0).concat(validateStep(1));
    if(errors.length){
      state.step=errors.some(e=>/Vorname|Nachname|Telefon|E-Mail|Sprache/.test(e))?0:1;
      state.showComplete=false;
      render();
      showValidation(errors);
      return;
    }
    if(typeof bridge.onComplete==="function"){
      bridge.onComplete(clone(state.data),buildOfferSummary());
    }
    clearDraft();
    close();
  }

  function clone(value){
    return JSON.parse(JSON.stringify(value||{}));
  }

  window.ACTConciergeWizard={
    init,
    open,
    close,
    clearDraft,
    buildOfferSummary
  };
})();
