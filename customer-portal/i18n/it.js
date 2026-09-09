/**
 * Ops Ready 5.0A/B.1 – Testi UI italiani (stessa struttura chiavi di de).
 */
(function(){
  "use strict";
  window.ACTPortalI18nCatalogs=window.ACTPortalI18nCatalogs||{};
  window.ACTPortalI18nCatalogs.it={
    navigation:{
      today:"Oggi",
      itinerary:"Itinerario",
      itineraryShort:"Viaggio",
      documents:"Documenti",
      service:"Servizio",
      discover:"Scopri",
      mainAria:"Navigazione principale",
      appAria:"Navigazione app"
    },
    language:{
      label:"Lingua",
      de:"Tedesco",
      en:"Inglese",
      it:"Italiano",
      fr:"Francese"
    },
    common:{
      open:"Apri",
      close:"Chiudi",
      loading:"Caricamento …",
      print:"Stampa",
      download:"Scarica",
      error:"Si è verificato un errore.",
      retry:"Riprova",
      notAvailable:"Non disponibile",
      secureNote:"Questa pagina è accessibile esclusivamente tramite il tuo link personale.",
      logout:"Esci",
      brand:"Alpine Concierge Tirol",
      guest:"Ospite",
      whatsappOpen:"Apri WhatsApp",
      contactWhatsApp:"Contatta Alpine Concierge Tirol",
      showAllFields:"Mostra tutti i campi",
      version:"Versione {version}",
      messages:{
        whatsappQuestion:"Buongiorno Alpine Concierge Tirol, ho una domanda sul mio programma di viaggio.",
        whatsappChange:"Buongiorno Alpine Concierge Tirol, vorrei richiedere una modifica al mio programma di viaggio."
      },
      alerts:{
        confirmThanks:"Grazie. La conferma reale verrà collegata in un passaggio successivo.",
        paymentLater:"La funzione di pagamento verrà collegata in un passaggio successivo.",
        pdfLater:"La creazione del PDF verrà collegata in un passaggio successivo.",
        documentPlaceholder:"{name}: Segnaposto documento per il passo 1.",
        calendarMissing:"Nessun evento di calendario esportabile disponibile.",
        calendarFailed:"Impossibile creare il file calendario."
      },
      actions:{
        showDetails:"Mostra dettagli",
        openNavigation:"Apri navigazione",
        openMaps:"Apri mappa",
        openRoute:"Apri percorso",
        call:"Chiama",
        email:"Scrivi e-mail",
        openWhatsApp:"Apri WhatsApp",
        openDocuments:"Apri documenti",
        openItinerary:"Apri itinerario",
        showMore:"Mostra di più",
        showLess:"Mostra meno",
        close:"Chiudi",
        retry:"Riprova"
      },
      loading:{
        default:"Caricamento …",
        preparing:"Preparazione dei dati …",
        weather:"Caricamento meteo …",
        portalTitle:"Caricamento dati …",
        tripPreparing:"Il vostro programma di viaggio personale è in preparazione."
      },
      errors:{
        loadFailed:"Impossibile caricare i dati.",
        connectionFailed:"Connessione non riuscita.",
        updateFailed:"Aggiornamento non riuscito.",
        unavailable:"Non disponibile"
      },
      status:{
        published:"Pubblicato"
      }
    },
    today:{
      hero:{
        eyebrow:"Alpine Concierge Tirol",
        title:"Benvenuto",
        welcome:"Ti diamo il benvenuto, {name}",
        subtitle:"Il vostro accompagnatore di viaggio personale per oggi."
      },
      focusAria:"Oggi in evidenza",
      overview:{
        title:"La vostra giornata in sintesi",
        schedule:"Programma della giornata",
        next:"Prossimo punto del programma",
        further:"Altri punti del programma",
        noFurther:"Nessun altro punto del programma"
      },
      schedule:{
        eyebrow:"A seguire",
        title:"Prossimo punto del programma",
        allDay:"Tutto il giorno",
        start:"Inizio",
        end:"Fine",
        duration:"Durata",
        meetingPoint:"Punto di incontro",
        location:"Luogo",
        notes:"Note",
        details:"Dettagli",
        today:"Oggi",
        tomorrow:"Domani",
        time:"Orario"
      },
      labels:{
        tripPeriod:"Periodo di viaggio",
        region:"Regione",
        companions:"Compagni di viaggio",
        tripStatus:"Stato del viaggio",
        countdown:"Conto alla rovescia",
        concierge:"Concierge",
        customerNumber:"Numero ospite",
        portal:"Portale",
        publication:"Pubblicazione"
      },
      actions:{
        showDetails:"Mostra dettagli",
        openNavigation:"Apri navigazione",
        missingStart:"Nessun punto di partenza disponibile"
      },
      quick:{
        eyebrow:"Accesso rapido",
        title:"Continua",
        itinerary:"Itinerario",
        documents:"Documenti",
        contact:"Contatto",
        whatsapp:"WhatsApp"
      },
      proposal:{
        title:"La Sua proposta personale è pronta",
        cta:"Vedere la proposta"
      },
      concierge:{
        eyebrow:"Concierge",
        title:"Importante oggi",
        personal:"Il vostro concierge personale",
        personalAria:"Concierge personale",
        currentHintsAria:"Note attuali",
        timeline:"Timeline del concierge",
        timelineAria:"Timeline della giornata",
        liveStatus:"Stato del viaggio in tempo reale",
        liveStatusAria:"Stato del viaggio in tempo reale",
        badWeather:"Alternative con maltempo",
        badWeatherAria:"Alternative con maltempo",
        evening:"Per questa sera consigliamo…",
        eveningAria:"Consiglio serale",
        profile:"Profilo di viaggio: {label}",
        greetingFallback:"Benvenuto"
      },
      weather:{
        eyebrow:"Meteo",
        title:"Meteo attuale",
        cardTitle:"Meteo di viaggio",
        forLocation:"Meteo per:",
        loadingTitle:"Caricamento meteo in tempo reale …",
        loadingCopy:"I dati arrivano direttamente da Open-Meteo per il vostro periodo di viaggio.",
        unavailableTitle:"Nessuna previsione affidabile",
        unavailable:"Dati meteo non disponibili",
        loadFailed:"Impossibile caricare i dati meteo.",
        source:"Fonte: Open-Meteo",
        sourceUnavailable:"Fonte: Open-Meteo (non disponibile)",
        coordinates:"Coordinate: {coords}",
        updated:"Aggiornato: {time}",
        noLocation:"Nessuna località meteo impostata",
        notSet:"Non definito",
        rain:"Pioggia: {value}%",
        precipitation:"Precipitazioni: {value} mm",
        wind:"Vento: {value} km/h",
        tempRange:"{min}°C fino a {max}°C",
        tooFar:"Una previsione meteo è disponibile a partire da 16 giorni prima dell'inizio del viaggio ({date}).",
        rangeUnavailable:"Al momento non è disponibile alcuna previsione per il periodo di viaggio.",
        partialBoth:"Mostra la finestra di previsione disponibile all'interno del viaggio ({start} fino a {end}).",
        partialPast:"Da oggi ({start}) fino alla fine del viaggio, per quanto la previsione sia disponibile.",
        partialFuture:"Previsione fino a {end}. Altri giorni seguiranno avvicinandosi alla data di viaggio.",
        codes:{
          0:"Sereno",
          1:"Prevalentemente soleggiato",
          2:"Parzialmente nuvoloso",
          3:"Nuvoloso",
          45:"Nebbia",
          48:"Nebbia con brina",
          51:"Pioggerella leggera",
          53:"Pioggerella",
          55:"Pioggerella intensa",
          61:"Pioggia leggera",
          63:"Pioggia",
          65:"Pioggia intensa",
          71:"Neve leggera",
          73:"Neve",
          75:"Neve intensa",
          80:"Rovesci di pioggia",
          81:"Rovesci",
          82:"Rovesci intensi",
          95:"Temporale",
          fallback:"Dati meteo"
        },
        clothing:{
          rain:"Prevedete una giacca impermeabile e scarpe idrofughe.",
          cold:"Portate strati caldi e una giacca antivento.",
          wind:"Si consiglia una giacca antivento.",
          hot:"Si consigliano protezione solare e abiti leggeri.",
          layers:"Abiti comodi a strati sono ideali."
        }
      },
      status:{
        eyebrow:"Ulteriori informazioni",
        title:"A che punto siete",
        label:"Stato del viaggio: {status}",
        updated:"Ultimo aggiornamento: {date}",
        defaultStatus:"Non ancora definito",
        steps:{
          inquiryReceived:"Richiesta ricevuta",
          offerCreated:"Offerta creata",
          offerSent:"Offerta inviata",
          offerConfirmed:"Offerta confermata",
          paymentOpen:"Pagamento in sospeso",
          depositReceived:"Acconto ricevuto",
          fullyPaid:"Completamente pagato",
          programInProgress:"Programma in elaborazione",
          programPublished:"Programma pubblicato",
          tripOngoing:"Viaggio in corso",
          tripCompleted:"Viaggio concluso"
        }
      },
      countdown:{
        pending:"Data in arrivo",
        daysUntil:"{count} giorni all'inizio del viaggio",
        tomorrow:"Il vostro viaggio inizia domani",
        today:"Il vostro viaggio inizia oggi",
        past:"Il periodo di viaggio è già passato"
      },
      next:{
        empty:"Al momento non è disponibile il prossimo punto del programma."
      },
      empty:{
        noSchedule:"Per oggi non è ancora previsto nulla.",
        preparing:"I vostri contenuti sono in preparazione.",
        noHints:"Nessuna nota disponibile.",
        noWeather:"Nessun dato meteo disponibile.",
        noNext:"Nessun prossimo punto del programma"
      },
      aria:{
        focus:"Oggi in evidenza",
        weather:"Meteo",
        nextEvent:"Prossimo punto del programma",
        concierge:"Concierge",
        quickActions:"Accesso rapido",
        status:"Stato del viaggio"
      }
    },
    itinerary:{
      hero:{
        eyebrow:"Alpine Concierge Tirol",
        title:"Itinerario",
        subtitle:"Il vostro accompagnatore di viaggio personale – giorno per giorno."
      },
      overview:{
        aria:"Panoramica del viaggio",
        period:"Periodo di viaggio",
        region:"Regione",
        duration:"Durata del viaggio"
      },
      navigation:{
        aria:"Navigazione giorni",
        eyebrow:"Giorni",
        title:"I vostri giorni di viaggio",
        allDays:"Tutti i giorni",
        travelDay:"Giorno di viaggio",
        arrival:"Arrivo",
        departure:"Partenza"
      },
      days:{
        label:"Giorno {n}",
        labelWithDate:"Giorno {n}, {date}",
        titleWithDate:"Giorno {n} · {date}",
        today:"Oggi",
        todaySuffix:", oggi",
        tomorrow:"Domani",
        yesterday:"Ieri",
        progress:"{done} di {total} punti del programma completati",
        oneDay:"1 giorno",
        daysNights:"{days} giorni · {nights} {nightsLabel}",
        night:"notte",
        nights:"notti"
      },
      day:{
        label:"Giorno {n}",
        labelWithDate:"Giorno {n}, {date}",
        todaySuffix:", oggi"
      },
      labels:{
        time:"Orario",
        begin:"Inizio",
        end:"Fine",
        date:"Data",
        category:"Categoria",
        location:"Luogo",
        duration:"Durata",
        meetingPoint:"Punto di incontro",
        notes:"Note",
        note:"Nota",
        description:"Descrizione",
        contact:"Referente",
        contactPerson:"Persona di contatto",
        phone:"Telefono",
        status:"Stato",
        provider:"Fornitore",
        address:"Indirizzo",
        outfit:"Abbigliamento / attrezzatura",
        documents:"Documenti",
        difficulty:"Difficoltà",
        distance:"Distanza",
        walkDuration:"Tempo di cammino",
        elevation:"Dislivello in salita",
        descent:"Discesa",
        weather:"Meteo",
        bookingNumber:"Numero di prenotazione",
        programItem:"Punto del programma",
        accommodation:"Alloggio",
        checkIn:"Check-in",
        checkOut:"Check-out",
        booking:"Prenotazione"
      },
      actions:{
        details:"Dettagli",
        showDetails:"Mostra dettagli",
        hideDetails:"Nascondi dettagli",
        showMore:"Mostra di più",
        showLess:"Mostra meno",
        readDescription:"Leggi descrizione",
        openRoute:"Apri percorso",
        navigation:"Navigazione",
        openMap:"Apri mappa",
        openNavigation:"Avvia navigazione",
        googleMaps:"Google Maps",
        appleMaps:"Apple Mappe",
        documents:"Documenti",
        photos:"Foto",
        hikeDetails:"Dettagli escursione",
        backToCalendar:"Torna al calendario",
        backToTimeline:"Torna alla timeline completa",
        previousItem:"Punto precedente",
        nextItem:"Punto successivo",
        openDocument:"Apri documento",
        openDocumentNamed:"Apri documento: {title}",
        saveTripCalendar:"Salva l'intero viaggio nel calendario",
        done:"Completato"
      },
      status:{
        optional:"Opzionale",
        reserved:"Prenotato",
        confirmed:"Confermato",
        planned:"Pianificato",
        completed:"Completato",
        continuation:"(continua)"
      },
      route:{
        title:"Percorso",
        hike:"Percorso escursionistico",
        overview:"Panoramica escursione",
        summary:"Info rapide",
        loading:"Caricamento mappa …",
        unavailable:"Percorso non disponibile",
        mapAria:"Mappa escursione compatta",
        interactiveMapAria:"Mappa interattiva del percorso",
        elevation:"Profilo altimetrico",
        elevationAria:"Profilo altimetrico interattivo",
        toolbarAria:"Barra della mappa",
        showLocation:"Mostra la mia posizione",
        openGoogleMaps:"Apri in Google Maps",
        mapNotReady:"La mappa non è ancora caricata.",
        locationUnsupported:"La posizione non è supportata su questo dispositivo.",
        locationDetecting:"Rilevamento della posizione …",
        yourLocation:"La vostra posizione",
        locationFailed:"Impossibile determinare la posizione. Controllare i permessi.",
        locationActive:"Posizione attiva (solo locale, non salvata)",
        toDestination:"{km} km fino alla destinazione",
        toHut:"{km} km fino al rifugio più vicino",
        toParking:"{km} km fino al parcheggio",
        elevationDistance:"Altitudine {elevation} · Distanza {distance}",
        start:"Partenza",
        end:"Arrivo"
      },
      calendar:{
        eyebrow:"Calendario",
        title:"Il vostro viaggio come calendario",
        toolbarAria:"Controlli calendario",
        viewAria:"Vista calendario",
        tripView:"Viaggio intero",
        dayView:"Vista giornaliera",
        allDay:"Tutto il giorno",
        exportMissing:"Nessun evento di calendario esportabile disponibile.",
        exportFailed:"Impossibile creare il file calendario."
      },
      timeline:{
        eyebrow:"Timeline completa",
        title:"Tutti i punti del programma in ordine",
        dayAria:"Timeline del giorno"
      },
      details:{
        eyebrow:"Dettagli",
        title:"Il vostro punto del programma"
      },
      bookings:{
        eyebrow:"Chiusura",
        title:"Servizi confermati",
        empty:"Al momento non sono visibili prenotazioni per voi."
      },
      empty:{
        calendar:"Non ci sono ancora punti del programma nel calendario.",
        program:"Per questo viaggio non sono ancora stati inseriti punti del programma.",
        none:"Nessun itinerario disponibile",
        preparing:"Il vostro viaggio è in preparazione.",
        noActivities:"Nessuna attività disponibile."
      },
      loading:{
        default:"Caricamento …",
        refresh:"Aggiorna",
        retry:"Riprova",
        failed:"Errore di caricamento"
      },
      aria:{
        view:"Itinerario",
        overview:"Panoramica del viaggio",
        dayNav:"Navigazione giorni",
        daySelector:"Selezione giorno",
        documents:"Documenti",
        accommodation:"Alloggio",
        weather:"Meteo"
      }
    },
    documents:{
      hero:{
        eyebrow:"Alpine Concierge Tirol",
        title:"I vostri documenti di viaggio",
        subtitle:"Tutti i documenti importanti in un unico posto.",
        intro:"Tutti i documenti importanti in un unico posto."
      },
      overview:{
        eyebrow:"Panoramica",
        title:"Le vostre categorie",
        copy:"Biglietti, voucher e documenti personali – organizzati chiaramente per tema.",
        documents:"Documenti",
        travelDocuments:"Documenti di viaggio",
        tickets:"Biglietti",
        bookings:"Prenotazioni",
        invoices:"Fatture",
        vouchers:"Voucher",
        contracts:"Contratti",
        insurance:"Assicurazione",
        travelInfo:"Informazioni di viaggio",
        downloads:"Download"
      },
      list:{
        eyebrow:"Documenti",
        title:"I vostri documenti"
      },
      notes:{
        eyebrow:"Concierge",
        title:"Domande sui vostri documenti?",
        copy:"Se manca un biglietto o un voucher, contattate semplicemente il vostro concierge – siamo lieti di aiutarvi."
      },
      categories:{
        accommodation:"Alloggio",
        flight:"Volo",
        train:"Treno",
        rentalCar:"Auto a noleggio",
        activities:"Attività",
        restaurant:"Ristorante",
        wellness:"Wellness",
        transfers:"Transfer",
        other:"Altro",
        tickets:"Biglietti",
        vouchers:"Voucher",
        bookings:"Prenotazioni",
        invoices:"Fatture",
        contracts:"Contratti",
        insurance:"Assicurazione",
        travelInfo:"Informazioni di viaggio",
        travel:"Viaggio",
        downloads:"Download",
        general:"Generale"
      },
      types:{
        pdf:"PDF",
        image:"Immagine",
        qr:"QR",
        word:"Word",
        excel:"Excel",
        ticket:"Biglietto",
        file:"File",
        document:"Documento"
      },
      fields:{
        fileName:"Nome file",
        category:"Categoria",
        fileSize:"Dimensione file",
        date:"Data",
        note:"Nota",
        expiryDate:"Data di scadenza"
      },
      actions:{
        open:"Apri",
        openNamed:"Apri documento: {title}",
        download:"Scarica",
        downloadNamed:"Scarica: {title}",
        preview:"Anteprima",
        share:"Condividi",
        print:"Stampa",
        new:"Nuovo",
        updated:"Aggiornato"
      },
      status:{
        available:"disponibile",
        preparing:"in preparazione",
        missing:"non presente",
        archived:"archiviato"
      },
      empty:{
        title:"Nessun documento disponibile",
        copy:"I documenti appariranno qui non appena saranno disponibili.",
        none:"Nessun documento disponibile",
        preparing:"I documenti sono in preparazione",
        noDownloads:"Ancora nessun download",
        concierge:"Concierge"
      },
      loading:{
        default:"Caricamento …",
        refresh:"Aggiorna",
        retry:"Riprova"
      },
      errors:{
        openFailed:"Impossibile aprire il documento",
        downloadFailed:"Download non riuscito",
        unavailable:"Documento non disponibile"
      },
      preview:{
        caption:"Anteprima documento"
      },
      count:{
        one:"{count} documento",
        other:"{count} documenti"
      },
      aria:{
        view:"Documenti",
        hero:"Documenti di viaggio",
        center:"Centro documenti",
        overview:"Panoramica documenti",
        categoryNav:"Categorie documenti",
        categoryChip:"{label}: {count}",
        notes:"Note sui documenti",
        open:"Apri",
        download:"Scarica",
        preview:"Anteprima"
      }
    },
    service:{
      hero:{
        eyebrow:"Service",
        title:"Il vostro concierge personale",
        subtitle:"Siamo al vostro fianco per desideri, domande e momenti speciali.",
        intro:"Siamo al vostro fianco per desideri, domande e momenti speciali."
      },
      overview:{
        eyebrow:"Supporto",
        title:"Cosa possiamo fare per voi",
        copy:"Aiuto diretto per programma, modifiche e necessità pratiche – basta un passo.",
        personalSupport:"Supporto personale",
        weAreHere:"Siamo qui per voi",
        individualCare:"Assistenza individuale",
        yourRequest:"La vostra richiesta",
        requestService:"Richiedere un servizio",
        getSupport:"Ottenere assistenza",
        personalRecommendation:"Raccomandazione personale",
        discreetReliable:"Discreto e affidabile",
        duringStay:"Durante il soggiorno"
      },
      concierge:{
        eyebrow:"Concierge",
        title:"Il vostro referente",
        personalCare:"Assistenza personale",
        lead:"Vi accompagniamo personalmente nel viaggio – dalla prima domanda al momento speciale sul posto.",
        personalConcierge:"Il vostro concierge personale"
      },
      accommodation:{
        eyebrow:"Alloggio",
        title:"Soggiorno",
        fallbackName:"Alloggio",
        checkIn:"Check-in",
        checkOut:"Check-out",
        contact:"Contatto",
        voucher:"Voucher",
        notes:"Note",
        openNavigation:"Apri navigazione"
      },
      history:{
        eyebrow:"Note",
        title:"Cronologia delle modifiche",
        copy:"Aggiornamenti importanti sul vostro viaggio – in ordine cronologico e chiari.",
        publishedVersion:"Versione {version} pubblicata"
      },
      categories:{
        travelPlanning:"Pianificazione del viaggio",
        restaurantReservation:"Prenotazione ristorante",
        transfers:"Transfer",
        activities:"Attività",
        tickets:"Biglietti",
        wellness:"Wellness",
        shopping:"Shopping",
        childcare:"Babysitting",
        petService:"Servizio per animali",
        specialRequests:"Richieste speciali",
        emergencySupport:"Supporto di emergenza",
        other:"Altro"
      },
      actions:{
        sendRequest:"Invia richiesta",
        openWhatsApp:"Apri WhatsApp",
        call:"Chiama",
        email:"Scrivi e-mail",
        selectService:"Seleziona servizio",
        showDetails:"Mostra dettagli",
        learnMore:"Scopri di più",
        back:"Indietro",
        close:"Chiudi",
        retry:"Riprova",
        sendChange:"Invia richiesta di modifica",
        confirmProgram:"Conferma programma",
        openPayment:"Apri pagamento",
        downloadPdf:"Scarica PDF",
        print:"Stampa",
        saveCalendar:"Salva calendario"
      },
      request:{
        title:"Di cosa possiamo occuparci?",
        message:"Il vostro messaggio",
        preferredTime:"Orario desiderato",
        priority:"Priorità",
        contactMethod:"Canale di contatto",
        send:"Invia messaggio",
        preparing:"Richiesta in preparazione",
        submitted:"Richiesta inviata",
        failed:"Impossibile inviare la richiesta"
      },
      form:{
        title:"Di cosa possiamo occuparci?",
        message:"Il vostro messaggio",
        preferredTime:"Orario desiderato",
        priority:"Priorità",
        contactMethod:"Canale di contatto",
        send:"Invia messaggio"
      },
      status:{
        preparing:"Richiesta in preparazione",
        submitted:"Richiesta inviata",
        failed:"Impossibile inviare la richiesta",
        processing:"Richiesta in elaborazione"
      },
      contact:{
        phone:"Telefono",
        email:"E-mail",
        whatsapp:"WhatsApp",
        reachability:"Disponibilità",
        personalContact:"Contatto personale",
        responseTime:"Tempo di risposta",
        urgentCases:"Nei casi urgenti",
        emergency:"Contatto di emergenza",
        localEmergency:"Numeri di emergenza locali"
      },
      empty:{
        hotel:"I dati del vostro alloggio sono in preparazione e appariranno qui non appena disponibili.",
        care:"La vostra assistenza personale è in preparazione.",
        historyTitle:"Nessuna modifica registrata",
        historyCopy:"Gli aggiornamenti sul vostro viaggio appariranno qui.",
        noServices:"Nessun servizio ancora disponibile",
        preparing:"Le vostre offerte di servizio sono in preparazione",
        noRecommendation:"Al momento nessuna raccomandazione disponibile",
        contactConcierge:"Vi preghiamo di contattare il vostro concierge"
      },
      loading:{
        default:"Caricamento …",
        processing:"Richiesta in elaborazione",
        refresh:"Aggiorna",
        retry:"Riprova"
      },
      errors:{
        loadFailed:"Impossibile caricare i dati",
        actionFailed:"Azione non riuscita",
        retry:"Vi preghiamo di riprovare",
        unavailable:"Servizio attualmente non disponibile",
        submitFailed:"Impossibile inviare la richiesta"
      },
      wish:{
        eyebrow:"Concierge",
        title:"Il mio desiderio",
        subtitle:"Raccontateci cosa possiamo organizzare per voi.",
        start:"Avvia desiderio",
        loginHint:"Vi preghiamo di accedere al vostro portale clienti personale per inviarci un desiderio.",
        login:"Vai al login personale",
        listTitle:"I vostri desideri",
        listEmpty:"Non ci avete ancora inviato un desiderio.",
        followUpLead:"Abbiamo già raccolto il vostro desiderio. Per prepararlo su misura per voi, abbiamo ancora alcune brevi domande.",
        followUpEmptyLead:"Il vostro concierge ha già il vostro desiderio presente.",
        followUpEmpty:"Al momento non abbiamo domande aperte per voi.",
        followUpListTitle:"Domande aperte",
        followUpStart:"Rispondere alle domande",
        followUpCount:"{count} domande aperte",
        followUpStatus:"Attendiamo le vostre risposte",
        followUpProgress:"Le vostre domande · {step} di {total}",
        followUpProgressReview:"Le vostre domande",
        reviewCheck:"Controllare le risposte",
        sendAnswers:"Inviare le risposte ad Alpine Concierge",
        sending:"Invio delle risposte…",
        submitSuccess:"Grazie, {name}. Le vostre risposte sono arrivate. Esamineremo personalmente le indicazioni e vi ricontatteremo.",
        submitSuccessAnonymous:"Grazie. Le vostre risposte sono arrivate. Esamineremo personalmente le indicazioni e vi ricontatteremo.",
        submitFailed:"Al momento non è stato possibile inviare le risposte. Riprovate.",
        submitAuth:"Vi preghiamo di accedere di nuovo al vostro portale clienti personale.",
        submitChanged:"Questo desiderio è nel frattempo cambiato. Ricaricate le domande aperte.",
        reloadFollowUps:"Ricaricare le domande attuali",
        followUpThanksEmpty:"Grazie – al momento non abbiamo ulteriori domande aperte per voi.",
        proposalTitle:"La Sua proposta personale",
        proposalLead:"Alpine Concierge Tirol ha preparato una proposta personale per Lei.",
        proposalLocation:"Luogo",
        proposalWhen:"Data",
        proposalPrice:"Prezzo",
        proposalNote:"Nota particolare",
        proposalView:"Vedere la proposta",
        proposalCategory:{
          experience:"Esperienza",
          culinary:"Cucina",
          nature:"Natura e montagne",
          wellness:"Wellness",
          culture:"Cultura e attrazioni",
          transfer:"Transfer e mobilità",
          media:"Fotografo / media",
          surprise:"Sorpresa / specialità",
          other:"Altro"
        },
        progress:"Il vostro desiderio · Passo {step}",
        next:"Avanti",
        back:"Indietro",
        close:"Chiudi",
        confirmDiscard:"I dati inseriti andranno persi. Chiudere davvero la finestra?",
        ideaHint:"Non serve ancora un piano definitivo. Raccontateci semplicemente cosa vi immaginate – pensiamo noi all’elaborazione.",
        ideaLabel:"La vostra idea",
        ideaPlaceholder:"Cosa vi immaginate?",
        adultsLabel:"Adulti",
        childrenLabel:"Bambini",
        childAgesLabel:"Età dei bambini",
        childAgeLabel:"Età bambino {n}",
        yes:"Sì",
        no:"No",
        edit:"Modifica desiderio",
        send:"Invia il desiderio ad Alpine Concierge",
        sendPending:"L’invio verrà collegato nel prossimo passo.",
        occasionForWhom:"Per chi è l’occasione?",
        occasionSurprise:"Deve restare una sorpresa?",
        dateLabel:"Data",
        dateFromLabel:"Dal",
        dateToLabel:"Al",
        datesLabel:"Giorni possibili",
        addDate:"Aggiungi giorno",
        stayPeriodHint:"{range}",
        excludedTitle:"Ci sono giorni in cui non è possibile?",
        excludedHint:"Facoltativo. Alpine Concierge sceglierà allora un altro giorno adatto.",
        excludedDatesLabel:"Giorni non possibili",
        addExcludedDate:"Escludi giorno",
        or:"o",
        dayTimeTitle:"Momento della giornata",
        durationTitle:"Durata",
        stayTitle:"Punto di partenza",
        profileStay:"Il mio soggiorno",
        otherStart:"Altro punto di partenza",
        customStartLabel:"Altro punto di partenza",
        radiusTitle:"Quanto lontano possiamo spingerci per un’esperienza speciale?",
        mobilityTitle:"Mobilità",
        avoidTitle:"Cosa preferite evitare?",
        experienceTitle:"Livello di esperienza",
        equipmentTitle:"Attrezzatura",
        allergiesLabel:"Allergie / intolleranze",
        atmosphereLabel:"Atmosfera desiderata",
        settingTitle:"Ambiente",
        privacyTitle:"Particolare privacy desiderata",
        privacyYes:"particolare privacy desiderata",
        attendeesLabel:"Numero di partecipanti",
        takeawayLabel:"Cosa dovrebbero portarsi i vostri ospiti dal Tirolo?",
        budgetScopeTitle:"Ambito di budget",
        specialDetailLabel:"Dettagli su {label}",
        notesLabel:"Cos’altro dovremmo sapere del vostro desiderio?",
        limits:{
          category:"Non potete scegliere altri temi.",
          mood:"Potete scegliere al massimo 5 atmosfere.",
          priority:"Potete scegliere al massimo 3 priorità."
        },
        step:{
          categories:"Di cosa possiamo occuparci?",
          idea:"Raccontateci la vostra idea.",
          participants:"Per chi possiamo pianificare?",
          occasion:"C’è un’occasione speciale?",
          timing:"Quando vorreste vivere il vostro desiderio?",
          location:"Punto di partenza",
          mood:"Come dovrebbe essere l’atmosfera?",
          activity:"Quanto può essere attivo?",
          culinary:"Cucina",
          wellness:"Wellness",
          business:"Business",
          budget:"In quale ambito possiamo pianificare per voi?",
          priorities:"Cosa conta di più per voi?",
          specialRequirements:"Esigenze particolari",
          conciergeMode:"Come vorreste essere accompagnati?",
          additionalNotes:"Cos’altro dovremmo sapere del vostro desiderio?",
          review:"Il vostro desiderio in un colpo d’occhio",
          followUpReview:"Le vostre indicazioni in un colpo d’occhio",
          desiredMood:"Come dovrebbe essere per voi?"
        },
        occasion:{
          none:"No",
          birthday:"Compleanno",
          anniversary:"Anniversario di matrimonio / anniversario",
          proposal:"Richiesta di matrimonio",
          wedding:"Matrimonio",
          surprise:"Sorpresa",
          "family-celebration":"Festa di famiglia",
          business:"Occasione di business",
          gift:"Regalo",
          reunion:"Ritrovo",
          other:"Altro"
        },
        timing:{
          date:"Giorno specifico",
          stay:"Durante il mio soggiorno",
          range:"Periodo",
          "several-days":"Più giorni possibili",
          flexible:"Sono flessibile",
          not_decided:"Non ancora deciso"
        },
        dayTime:{
          morning:"Mattina",
          midday:"Mezzogiorno",
          afternoon:"Pomeriggio",
          evening:"Sera",
          "full-day":"giornata intera",
          flexible:"flessibile"
        },
        duration:{
          "1-2h":"1–2 ore",
          "2-4h":"2–4 ore",
          "half-day":"mezza giornata",
          "full-day":"giornata intera",
          "several-days":"più giorni",
          open:"aperto"
        },
        radius:{
          nearby:"il più vicino possibile",
          "30min":"fino a circa 30 minuti",
          "60min":"fino a circa 1 ora",
          further:"anche più lontano, se ne vale la pena",
          any:"indifferente"
        },
        mobility:{
          "own-car":"auto propria",
          rental:"auto a noleggio",
          public:"mezzi pubblici",
          transfer:"transfer / autista desiderato",
          open:"aperto"
        },
        mood:{
          exclusive:"esclusivo",
          authentic:"autentico",
          extraordinary:"straordinario",
          romantic:"romantico",
          adventurous:"avventuroso",
          relaxed:"rilassato",
          "nature-connected":"a contatto con la natura",
          regional:"regionale",
          luxurious:"lussuoso",
          sporty:"sportivo",
          sociable:"socievole",
          quiet:"tranquillo",
          private:"privato",
          inspiring:"ispirante",
          "family-friendly":"adatto alle famiglie",
          offbeat:"fuori dai soliti percorsi",
          "typical-tirol":"tipicamente tirolese"
        },
        avoidance:{
          crowds:"folle",
          "tourist-hotspots":"luoghi turistici",
          "long-drives":"lunghi tragitti in auto",
          "physical-strain":"grande sforzo fisico",
          formal:"atmosfera formale",
          "early-start":"sveglie presto",
          "long-hikes":"lunghe camminate",
          altitude:"altitudine",
          none:"niente di tutto questo",
          other:"Altro"
        },
        activityLevel:{
          "very-relaxed":"molto tranquillo",
          "lightly-active":"leggermente attivo",
          active:"attivo",
          sporty:"sportivo",
          demanding:"impegnativo",
          any:"indifferente"
        },
        activityExperience:{
          beginner:"principiante",
          occasional:"occasionale",
          experienced:"esperto",
          "very-experienced":"molto esperto"
        },
        activityEquipment:{
          own:"attrezzatura propria",
          needed:"attrezzatura necessaria",
          unknown:"non lo so ancora"
        },
        culinary:{
          tyrolean:"cucina tirolese",
          "fine-dining":"Fine dining",
          modern:"moderna / creativa",
          international:"internazionale",
          traditional:"tradizionale",
          vegetarian:"vegetariana",
          vegan:"vegana",
          wine:"vino",
          "private-dining":"Private dining",
          hut:"malga / baita",
          "extraordinary-location":"location straordinaria",
          surprise:"lasciateci sorprendere"
        },
        wellness:{
          "day-spa":"Day spa",
          massage:"Massaggio / trattamento",
          sauna:"Sauna / wellness",
          "private-spa":"Private spa",
          retreat:"riposo e ritiro",
          beauty:"Beauty",
          "special-hotel":"hotel particolare",
          "special-overnight":"pernottamento straordinario",
          open:"aperto"
        },
        wellnessSetting:{
          indoor:"Indoor",
          outdoor:"Outdoor",
          any:"indifferente"
        },
        business:{
          meeting:"Incontro di lavoro",
          "client-care":"Cura dei clienti",
          "team-event":"Evento di team",
          "business-dinner":"Cena di lavoro",
          incentive:"Incentive",
          "supporting-program":"Programma di accompagnamento",
          "international-guests":"ospiti internazionali",
          transfer:"Transfer",
          other:"Altro"
        },
        budget:{
          "up-to-100":"fino a 100 € a persona",
          "100-250":"100–250 € a persona",
          "250-500":"250–500 € a persona",
          "500-1000":"500–1.000 € a persona",
          "over-1000":"oltre 1.000 € a persona",
          open:"aperto – decide l’esperienza",
          "consult-first":"prima una consulenza"
        },
        budgetScope:{
          per_person:"a persona",
          total:"budget complessivo"
        },
        priority:{
          uniqueness:"Unicità",
          quality:"Qualità",
          privacy:"Privacy",
          authenticity:"Autenticità",
          price:"Prezzo",
          comfort:"Comfort",
          regionality:"Carattere regionale",
          flexibility:"Flessibilità",
          exclusivity:"Esclusività",
          availability:"disponibilità spontanea",
          "child-friendly":"Adatto ai bambini",
          sustainability:"Sostenibilità"
        },
        special:{
          diet:"Alimentazione / allergie",
          "limited-mobility":"mobilità ridotta",
          accessibility:"accessibilità",
          stroller:"passeggino",
          pet:"animale domestico",
          "fear-of-heights":"paura dell’altezza",
          physical:"esigenze fisiche particolari",
          discretion:"particolare discrezione",
          none:"nessuna"
        },
        concierge:{
          ideas:"Cerchiamo idee",
          compose:"Preparate qualcosa per noi",
          organize:"Sappiamo già abbastanza bene cosa vogliamo",
          surprise:"Sorprendeteci"
        },
        conciergeLead:{
          ideas:"Vorremmo prima ricevere delle proposte.",
          compose:"Vi raccontiamo i nostri desideri – voi sviluppate l’esperienza.",
          organize:"Ci serve supporto per organizzazione e prenotazioni.",
          surprise:"Potete essere creativi."
        },
        review:{
          categories:"Di cosa si tratta",
          idea:"La vostra idea",
          participants:"Per chi",
          occasion:"Occasione",
          timing:"Quando",
          timingStay:"Durante il soggiorno · {range}",
          timingExcluded:"Non possibile: {dates}",
          timingPreferred:"Preferito: {times}",
          timingFlexible:"Flessibile – Alpine Concierge può scegliere il giorno più adatto.",
          timingOpen:"Non ancora deciso.",
          location:"Punto di partenza e mobilità",
          mood:"Come dovrebbe essere",
          avoidances:"Cosa preferite evitare",
          activity:"Attività",
          culinary:"Cucina",
          wellness:"Wellness",
          business:"Business",
          budget:"Budget",
          priorities:"Priorità",
          special:"Esigenze particolari",
          concierge:"Tipo di accompagnamento",
          notes:"Altro"
        },
        category:{
          "individual-experience":"Esperienza individuale",
          culinary:"Cucina e piacere",
          nature:"Natura e montagne",
          sport:"Sport e attività",
          wellness:"Wellness e relax",
          culture:"Cultura ed eventi",
          shopping:"Shopping e trovare qualcosa di speciale",
          transfer:"Transfer e mobilità",
          business:"Business e incontri",
          occasion:"Occasione speciale",
          family:"Famiglia e bambini",
          "surprise-me":"Sorprendetemi",
          other:"Qualcos’altro"
        },
        participant:{
          solo:"Solo per me",
          couple:"Coppia",
          family:"Famiglia",
          friends:"Amici",
          business:"Partner d’affari / colleghi",
          group:"Gruppo",
          "surprise-other":"Sorpresa per qualcun altro"
        },
        errors:{
          categoryRequired:"Vi preghiamo di scegliere almeno un tema.",
          ideaRequired:"Vi preghiamo di raccontarci la vostra idea.",
          ideaTooLong:"L’idea è troppo lunga.",
          participantRequired:"Vi preghiamo di indicare per chi dobbiamo pianificare.",
          adultsInvalid:"Vi preghiamo di indicare un numero valido di adulti.",
          childrenInvalid:"Vi preghiamo di indicare un numero valido di bambini.",
          childAgesInvalid:"Vi preghiamo di indicare l’età dei bambini.",
          occasionRequired:"Vi preghiamo di indicare l’occasione.",
          occasionForWhom:"L’indicazione «Per chi?» è troppo lunga.",
          timingMode:"Vi preghiamo di indicare il periodo.",
          timingDate:"Vi preghiamo di indicare una data.",
          timingRange:"Vi preghiamo di indicare un periodo.",
          timingStay:"Questa opzione richiede le date di soggiorno già presenti nel portale.",
          timingOrder:"La data finale è precedente a quella iniziale.",
          timingDates:"Vi preghiamo di indicare almeno un giorno possibile.",
          timingExcluded:"I giorni esclusi devono rientrare nel periodo indicato.",
          timingDayTime:"Vi preghiamo di indicare un momento della giornata.",
          timingDuration:"Vi preghiamo di indicare la durata.",
          travelRadius:"Vi preghiamo di indicare la distanza accettata.",
          mobility:"Vi preghiamo di indicare la mobilità.",
          customStart:"Vi preghiamo di indicare l’altro punto di partenza.",
          moodLimit:"Vi preghiamo di scegliere al massimo 5 atmosfere.",
          activityLevel:"Vi preghiamo di indicare il livello di attività.",
          attendees:"Vi preghiamo di indicare un numero valido di partecipanti.",
          budget:"Vi preghiamo di indicare un ambito di budget.",
          priorityLimit:"Vi preghiamo di scegliere al massimo 3 priorità.",
          specialRequired:"Vi preghiamo di indicare esigenze particolari o «nessuna».",
          conciergeMode:"Vi preghiamo di indicare come accompagnarvi.",
          notesTooLong:"La nota finale è troppo lunga.",
          followUpRequired:"Vi preghiamo di rispondere a questa domanda.",
          generic:"Vi preghiamo di controllare le risposte di questo passo."
        }
      },
      aria:{
        view:"Service",
        hero:"Service",
        contact:"Contatto concierge",
        accommodation:"Alloggio",
        actions:"Azioni di servizio",
        history:"Cronologia delle modifiche",
        wish:"Il mio desiderio",
        wishWizard:"Formulare un desiderio",
        wishStart:"Avvia desiderio",
        wishList:"I vostri desideri",
        wishLogin:"Vai al login personale",
        openWhatsApp:"Apri WhatsApp",
        call:"Chiama",
        email:"Scrivi e-mail"
      }
    },
    discover:{
      hero:{
        eyebrow:"Concierge",
        title:"Scoprire",
        subtitle:"Consigli speciali per il vostro soggiorno.",
        intro:"Consigli speciali per il vostro soggiorno."
      },
      overview:{
        eyebrow:"Selezione",
        title:"Raccomandazioni",
        personal:"Personale",
        themes:"Temi",
        categoriesTitle:"Le vostre categorie",
        region:"Regione",
        surroundings:"I vostri dintorni",
        selectedForYou:"Selezionato personalmente per voi",
        ourRecommendations:"Le nostre raccomandazioni",
        specialExperiences:"Esperienze speciali",
        discoverTirol:"Scoprite il Tirolo",
        curatedForYou:"Curato per voi",
        nearby:"Nelle vicinanze",
        recommendedToday:"Consigliato oggi",
        matchingTrip:"In linea con il vostro viaggio"
      },
      concierge:{
        eyebrow:"Concierge",
        insiderTip:"Consiglio dell'insider",
        recommendation:"Raccomandazione del vostro concierge",
        curated:"Curato per voi"
      },
      recommendations:{
        featuredTitle:"Oggi vi consigliamo",
        featuredEyebrow:"Oggi vi consigliamo…",
        regionCopy:"Idee selezionate personalmente intorno al vostro soggiorno – calme, regionali e in linea con il viaggio.",
        regionFallback:"La vostra regione",
        surroundingsEyebrow:"Dintorni"
      },
      categories:{
        culinary:"Cucina",
        restaurants:"Ristoranti",
        restaurant:"Ristorante",
        nature:"Natura",
        hiking:"Escursionismo",
        hike:"Escursionismo",
        mountains:"Montagne",
        culture:"Cultura",
        sights:"Attrazioni",
        wellness:"Wellness",
        family:"Famiglia",
        children:"Bambini",
        shopping:"Shopping",
        sport:"Sport",
        winter:"Inverno",
        summer:"Estate",
        events:"Eventi",
        event:"Eventi",
        tips:"Consigli segreti",
        tip:"Consiglio",
        excursions:"Escursioni",
        other:"Altro",
        general:"Generale",
        viewpoint:"Belvedere",
        evening:"Sera",
        indoor:"Indoor",
        warning:"Nota",
        transport:"Transfer",
        activity:"Attività",
        recommendation:"Raccomandazione"
      },
      cards:{
        learnMore:"Scopri di più",
        showDetails:"Mostra dettagli",
        openRoute:"Apri percorso",
        openMap:"Apri mappa",
        openWebsite:"Apri sito web",
        call:"Chiama",
        email:"Scrivi e-mail",
        requestReservation:"Richiedi una prenotazione",
        addToItinerary:"Aggiungi all'itinerario",
        favorite:"Preferito",
        recommended:"Consigliato",
        new:"Nuovo"
      },
      actions:{
        learnMore:"Scopri di più",
        navigation:"Navigazione",
        openRegionMaps:"Apri la regione in Maps",
        startNavigation:"Avvia navigazione",
        showDetails:"Mostra dettagli",
        openRoute:"Apri percorso",
        openMap:"Apri mappa",
        openWebsite:"Apri sito web",
        call:"Chiama",
        email:"Scrivi e-mail",
        requestReservation:"Richiedi una prenotazione",
        addToItinerary:"Aggiungi all'itinerario"
      },
      labels:{
        distance:"Distanza",
        openingHours:"Orari di apertura",
        duration:"Durata",
        price:"Prezzo",
        suitableFor:"Adatto a",
        note:"Nota",
        recommendation:"Raccomandazione"
      },
      status:{
        favorite:"Preferito",
        recommended:"Consigliato",
        new:"Nuovo"
      },
      filters:{
        all:"Tutti",
        categories:"Categorie",
        nearby:"Nelle vicinanze",
        forToday:"Per oggi",
        forFamilies:"Per famiglie",
        badWeather:"Con cattivo tempo",
        free:"Gratuito",
        open:"Aperto",
        reset:"Reimposta",
        results:"Risultati",
        noMatches:"Nessun risultato"
      },
      navigation:{
        all:"Tutti",
        categories:"Categorie",
        results:"Risultati"
      },
      map:{
        title:"Mappa",
        location:"Posizione",
        loading:"Caricamento mappa",
        locationUnavailable:"Posizione non disponibile"
      },
      route:{
        title:"Percorso",
        startNavigation:"Avvia navigazione",
        unavailable:"Percorso non disponibile"
      },
      empty:{
        title:"Nessuna raccomandazione ancora",
        copy:"I consigli personali appariranno qui non appena disponibili.",
        none:"Nessuna raccomandazione ancora disponibile",
        preparing:"Le vostre raccomandazioni sono in preparazione",
        noMatch:"Al momento nessuna esperienza adatta trovata",
        conciergePreparing:"Il vostro concierge sta preparando suggerimenti personali per voi",
        noResults:"Nessun risultato per questa selezione"
      },
      loading:{
        default:"Caricamento …",
        preparing:"Raccomandazioni in preparazione",
        refresh:"Aggiorna",
        retry:"Riprova"
      },
      errors:{
        loadFailed:"Impossibile caricare i dati",
        unavailable:"Raccomandazione non disponibile",
        actionFailed:"Azione non riuscita",
        retry:"Vi preghiamo di riprovare"
      },
      aria:{
        view:"Scoprire",
        hero:"Scoprire",
        featured:"Raccomandazione personale",
        categories:"Categorie",
        list:"Raccomandazioni",
        region:"I vostri dintorni",
        categoryChip:"{label}: {count}",
        learnMore:"Scopri di più",
        navigation:"Navigazione"
      }
    },
    errors:{
      notFound:{
        title:"Portale non trovato",
        copy:"Controlla il tuo link personale oppure contatta direttamente Alpine Concierge Tirol."
      },
      shareUnavailable:{
        title:"Portale non disponibile",
        copy:"Questo link al portale non è valido o non è più disponibile."
      },
      invalidLink:{
        title:"Link non valido",
        copy:"Questo link di accesso non è valido. Usa il tuo link personale al portale."
      },
      accessDisabled:{
        title:"Accesso non disponibile",
        copy:"Questo accesso al portale non è al momento disponibile. Contatta Alpine Concierge Tirol."
      },
      sessionExpired:{
        title:"Sessione scaduta",
        copy:"La sessione è scaduta. Accedi di nuovo."
      },
      temporarilyUnavailable:"L'accesso al portale è temporaneamente non disponibile.",
      documentUnavailable:"Documento non disponibile"
    },
    aria:{
      header:"Intestazione del portale clienti",
      language:"Lingua",
      weather:"Meteo",
      documents:"Documenti",
      interactiveRouteMap:"Mappa interattiva del percorso",
      compactHikeMap:"Mappa escursione compatta",
      elevationProfile:"Profilo altimetrico interattivo",
      mapToolbar:"Barra della mappa",
      daySelector:"Selezione giorno",
      calendarControls:"Controlli calendario",
      calendarView:"Vista calendario"
    },
    date:{
      today:"oggi"
    },
    inquiry:{
      title:"La Sua richiesta personale",
      intro:"Per poterle proporre qualcosa di adatto, abbiamo ancora alcune brevi domande.",
      loading:"La Sua richiesta personale è in caricamento …",
      invalid:"Questo link personale non è più valido. La preghiamo di contattare Alpine Concierge Tirol se desidera ulteriore assistenza.",
      success:"Grazie. I Suoi dati sono arrivati. Esamineremo personalmente le Sue richieste e La ricontatteremo.",
      successTitle:"Grazie",
      checkAnswers:"La preghiamo di verificare i Suoi dati.",
      required:"Obbligatorio",
      optional:"facoltativo",
      sending:"I Suoi dati vengono inviati …",
      next:"Avanti",
      reviewNext:"Controllare le risposte",
      back:"Indietro",
      send:"Inviare le risposte ad Alpine Concierge",
      edit:"Modificare la richiesta",
      unconfirmedTitle:"I Suoi dati",
      unconfirmed:"Non abbiamo potuto confermare con certezza la ricezione dei Suoi dati. La preghiamo di non aprire il link più volte e di contattare Alpine Concierge Tirol in caso di dubbi.",
      contact:"Contattare Alpine Concierge Tirol",
      documentTitle:"La Sua richiesta personale | Alpine Concierge Tirol",
      linkTitle:"Link personale"
    }
  };
})();
