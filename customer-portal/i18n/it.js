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
      brand:"Alpine Concierge Tirol",
      whatsappOpen:"Apri WhatsApp",
      contactWhatsApp:"Contatta Alpine Concierge Tirol",
      showAllFields:"Mostra tutti i campi",
      version:"Versione {version}",
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
        weather:"Caricamento meteo …"
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
        welcome:"Benvenuto {name}",
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
        openGoogleMaps:"Apri in Google Maps"
      },
      calendar:{
        eyebrow:"Calendario",
        title:"Il vostro viaggio come calendario",
        toolbarAria:"Controlli calendario",
        viewAria:"Vista calendario",
        tripView:"Viaggio intero",
        dayView:"Vista giornaliera",
        allDay:"Tutto il giorno"
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
      hero:{title:"Il tuo concierge personale"},
      empty:{
        hotel:"I dati della tua sistemazione sono in preparazione e appariranno qui non appena disponibili.",
        care:"La tua assistenza personale è in preparazione.",
        historyTitle:"Nessuna modifica registrata",
        historyCopy:"Gli aggiornamenti sul tuo viaggio appariranno qui."
      }
    },
    discover:{
      hero:{title:"Scopri"},
      empty:{
        title:"Nessuna raccomandazione ancora",
        copy:"I consigli personali appariranno qui non appena disponibili."
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
    }
  };
})();
