/**
 * Ops Ready 5.0A/B.1 – Deutsche UI-Texte (Referenzstruktur).
 * Nur statische Portal-UI. Keine Kundendaten.
 */
(function(){
  "use strict";
  window.ACTPortalI18nCatalogs=window.ACTPortalI18nCatalogs||{};
  window.ACTPortalI18nCatalogs.de={
    navigation:{
      today:"Heute",
      itinerary:"Reiseplan",
      itineraryShort:"Reise",
      documents:"Dokumente",
      service:"Service",
      discover:"Entdecken",
      mainAria:"Hauptnavigation",
      appAria:"App-Navigation"
    },
    language:{
      label:"Sprache",
      de:"Deutsch",
      en:"Englisch",
      it:"Italienisch",
      fr:"Französisch"
    },
    common:{
      open:"Öffnen",
      close:"Schließen",
      loading:"Wird geladen …",
      print:"Drucken",
      download:"Herunterladen",
      error:"Es ist ein Fehler aufgetreten.",
      retry:"Erneut versuchen",
      notAvailable:"Nicht verfügbar",
      secureNote:"Diese Seite ist ausschließlich über Ihren persönlichen Link erreichbar.",
      logout:"Abmelden",
      brand:"Alpine Concierge Tirol",
      guest:"Gast",
      whatsappOpen:"WhatsApp öffnen",
      contactWhatsApp:"Alpine Concierge Tirol kontaktieren",
      showAllFields:"Alle Felder anzeigen",
      version:"Version {version}",
      messages:{
        whatsappQuestion:"Hallo Alpine Concierge Tirol, ich habe eine Frage zu meinem Reiseprogramm.",
        whatsappChange:"Hallo Alpine Concierge Tirol, ich habe einen Änderungswunsch zu meinem Reiseprogramm."
      },
      alerts:{
        confirmThanks:"Danke. Die echte Bestätigung wird in einem späteren Schritt angebunden.",
        paymentLater:"Zahlungsfunktion wird in einem späteren Schritt angebunden.",
        pdfLater:"PDF-Erstellung wird in einem späteren Schritt angebunden.",
        documentPlaceholder:"{name}: Dokument-Platzhalter für Schritt 1.",
        calendarMissing:"Keine exportierbaren Kalendertermine vorhanden.",
        calendarFailed:"Kalenderdatei konnte nicht erstellt werden."
      },
      actions:{
        showDetails:"Details anzeigen",
        openNavigation:"Navigation öffnen",
        openMaps:"Karte öffnen",
        openRoute:"Route öffnen",
        call:"Anrufen",
        email:"E-Mail schreiben",
        openWhatsApp:"WhatsApp öffnen",
        openDocuments:"Dokumente öffnen",
        openItinerary:"Reiseplan öffnen",
        showMore:"Mehr anzeigen",
        showLess:"Weniger anzeigen",
        close:"Schließen",
        retry:"Erneut versuchen"
      },
      loading:{
        default:"Wird geladen …",
        preparing:"Daten werden vorbereitet …",
        weather:"Wetter wird geladen …",
        portalTitle:"Daten werden geladen …",
        tripPreparing:"Ihr persönliches Reiseprogramm wird vorbereitet."
      },
      errors:{
        loadFailed:"Daten konnten nicht geladen werden.",
        connectionFailed:"Verbindung fehlgeschlagen.",
        updateFailed:"Aktualisierung fehlgeschlagen.",
        unavailable:"Nicht verfügbar"
      },
      status:{
        published:"Veröffentlicht"
      }
    },
    today:{
      hero:{
        eyebrow:"Alpine Concierge Tirol",
        title:"Willkommen",
        welcome:"Willkommen, {name}",
        subtitle:"Ihr persönlicher Reisebegleiter für heute."
      },
      focusAria:"Heute im Fokus",
      overview:{
        title:"Ihr Tag auf einen Blick",
        schedule:"Tagesprogramm",
        next:"Nächster Programmpunkt",
        further:"Weitere Programmpunkte",
        noFurther:"Keine weiteren Programmpunkte"
      },
      schedule:{
        eyebrow:"Als Nächstes",
        title:"Nächster Programmpunkt",
        allDay:"Ganztägig",
        start:"Beginn",
        end:"Ende",
        duration:"Dauer",
        meetingPoint:"Treffpunkt",
        location:"Ort",
        notes:"Hinweise",
        details:"Details",
        today:"Heute",
        tomorrow:"Morgen",
        time:"Uhrzeit"
      },
      labels:{
        tripPeriod:"Reisezeitraum",
        region:"Region",
        companions:"Mitreisende",
        tripStatus:"Reisestatus",
        countdown:"Countdown",
        concierge:"Concierge",
        customerNumber:"Kundennummer",
        portal:"Portal",
        publication:"Veröffentlichung"
      },
      actions:{
        showDetails:"Details anzeigen",
        openNavigation:"Navigation öffnen",
        missingStart:"Kein Startpunkt vorhanden"
      },
      quick:{
        eyebrow:"Schnellzugriff",
        title:"Weiter",
        itinerary:"Reiseplan",
        documents:"Dokumente",
        contact:"Kontakt",
        whatsapp:"WhatsApp"
      },
      concierge:{
        eyebrow:"Concierge",
        title:"Heute wichtig",
        personal:"Ihr persönlicher Concierge",
        personalAria:"Persönlicher Concierge",
        currentHintsAria:"Aktuelle Hinweise",
        timeline:"Concierge Timeline",
        timelineAria:"Tages-Timeline",
        liveStatus:"Live Reisestatus",
        liveStatusAria:"Live Reisestatus",
        badWeather:"Schlechtwetter-Alternativen",
        badWeatherAria:"Schlechtwetter Alternativen",
        evening:"Heute Abend empfehlen wir…",
        eveningAria:"Abendempfehlung",
        profile:"Reiseprofil: {label}",
        greetingFallback:"Willkommen"
      },
      weather:{
        eyebrow:"Wetter",
        title:"Aktuelles Wetter",
        cardTitle:"Reisewetter",
        forLocation:"Wetter für:",
        loadingTitle:"Live-Wetter wird geladen …",
        loadingCopy:"Daten kommen direkt von Open-Meteo für Ihren Reisezeitraum.",
        unavailableTitle:"Keine belastbare Vorhersage",
        unavailable:"Wetterdaten nicht verfügbar",
        loadFailed:"Wetterdaten konnten nicht geladen werden.",
        source:"Quelle: Open-Meteo",
        sourceUnavailable:"Quelle: Open-Meteo (nicht verfügbar)",
        coordinates:"Koordinaten: {coords}",
        updated:"Aktualisiert: {time}",
        noLocation:"Kein Wetter-Ort hinterlegt",
        notSet:"Nicht festgelegt",
        rain:"Regen: {value}%",
        precipitation:"Niederschlag: {value} mm",
        wind:"Wind: {value} km/h",
        tempRange:"{min}°C bis {max}°C",
        tooFar:"Eine Wettervorhersage ist erst ab 16 Tage vor Reisebeginn ({date}) verfügbar.",
        rangeUnavailable:"Für den Reisezeitraum liegt aktuell keine Vorhersage vor.",
        partialBoth:"Zeigt den verfügbaren Vorhersagezeitraum innerhalb Ihrer Reise ({start} bis {end}).",
        partialPast:"Ab heute ({start}) bis Reiseende, soweit Vorhersage verfügbar.",
        partialFuture:"Vorhersage bis {end}. Weitere Tage folgen näher am Reisedatum.",
        codes:{
          0:"Klar",
          1:"Überwiegend sonnig",
          2:"Teilweise bewölkt",
          3:"Bewölkt",
          45:"Nebel",
          48:"Reifnebel",
          51:"Leichter Nieselregen",
          53:"Nieselregen",
          55:"Starker Nieselregen",
          61:"Leichter Regen",
          63:"Regen",
          65:"Starker Regen",
          71:"Leichter Schnee",
          73:"Schnee",
          75:"Starker Schnee",
          80:"Regenschauer",
          81:"Schauer",
          82:"Starke Schauer",
          95:"Gewitter",
          fallback:"Wetterdaten"
        },
        clothing:{
          rain:"Regenjacke und wasserfeste Schuhe einplanen.",
          cold:"Warme Schichten und winddichte Jacke einpacken.",
          wind:"Windfeste Jacke empfohlen.",
          hot:"Sonnenschutz und leichte Kleidung empfohlen.",
          layers:"Bequeme Kleidung in Schichten ist passend."
        }
      },
      status:{
        eyebrow:"Weitere Informationen",
        title:"Wo Sie stehen",
        label:"Reisestatus: {status}",
        updated:"Zuletzt aktualisiert: {date}",
        defaultStatus:"Noch nicht festgelegt",
        steps:{
          inquiryReceived:"Anfrage eingegangen",
          offerCreated:"Angebot erstellt",
          offerSent:"Angebot gesendet",
          offerConfirmed:"Angebot bestätigt",
          paymentOpen:"Zahlung offen",
          depositReceived:"Anzahlung erhalten",
          fullyPaid:"Vollständig bezahlt",
          programInProgress:"Programm in Bearbeitung",
          programPublished:"Programm veröffentlicht",
          tripOngoing:"Reise läuft",
          tripCompleted:"Reise abgeschlossen"
        }
      },
      countdown:{
        pending:"Datum folgt",
        daysUntil:"{count} Tage bis Reisebeginn",
        tomorrow:"Morgen beginnt Ihre Reise",
        today:"Ihre Reise beginnt heute",
        past:"Reisezeitraum liegt in der Vergangenheit"
      },
      next:{
        empty:"Aktuell ist kein nächster Programmpunkt hinterlegt."
      },
      empty:{
        noSchedule:"Für heute ist noch nichts geplant.",
        preparing:"Ihre Inhalte werden vorbereitet.",
        noHints:"Keine Hinweise vorhanden.",
        noWeather:"Keine Wetterdaten verfügbar.",
        noNext:"Kein nächster Programmpunkt"
      },
      aria:{
        focus:"Heute im Fokus",
        weather:"Wetter",
        nextEvent:"Nächster Programmpunkt",
        concierge:"Concierge",
        quickActions:"Schnellzugriff",
        status:"Reisestatus"
      }
    },
    itinerary:{
      hero:{
        eyebrow:"Alpine Concierge Tirol",
        title:"Reiseplan",
        subtitle:"Ihr persönlicher Reisebegleiter – Tag für Tag."
      },
      overview:{
        aria:"Reiseübersicht",
        period:"Reisezeitraum",
        region:"Region",
        duration:"Reisedauer"
      },
      navigation:{
        aria:"Tagesnavigation",
        eyebrow:"Tage",
        title:"Ihre Reisetage",
        allDays:"Alle Tage",
        travelDay:"Reisetag",
        arrival:"Anreise",
        departure:"Abreise"
      },
      days:{
        label:"Tag {n}",
        labelWithDate:"Tag {n}, {date}",
        titleWithDate:"Tag {n} · {date}",
        today:"Heute",
        todaySuffix:", heute",
        tomorrow:"Morgen",
        yesterday:"Gestern",
        progress:"{done} von {total} Programmpunkten abgeschlossen",
        oneDay:"1 Tag",
        daysNights:"{days} Tage · {nights} {nightsLabel}",
        night:"Nacht",
        nights:"Nächte"
      },
      day:{
        label:"Tag {n}",
        labelWithDate:"Tag {n}, {date}",
        todaySuffix:", heute"
      },
      labels:{
        time:"Uhrzeit",
        begin:"Beginn",
        end:"Ende",
        date:"Datum",
        category:"Kategorie",
        location:"Ort",
        duration:"Dauer",
        meetingPoint:"Treffpunkt",
        notes:"Hinweise",
        note:"Hinweis",
        description:"Beschreibung",
        contact:"Ansprechpartner",
        contactPerson:"Kontaktperson",
        phone:"Telefon",
        status:"Status",
        provider:"Anbieter",
        address:"Adresse",
        outfit:"Kleidung / Ausrüstung",
        documents:"Dokumente",
        difficulty:"Schwierigkeit",
        distance:"Distanz",
        walkDuration:"Gehzeit",
        elevation:"Höhenmeter",
        descent:"Abstieg",
        weather:"Wetter",
        bookingNumber:"Buchungsnummer",
        programItem:"Programmpunkt",
        accommodation:"Unterkunft",
        checkIn:"Check-in",
        checkOut:"Check-out",
        booking:"Buchung"
      },
      actions:{
        details:"Details",
        showDetails:"Details anzeigen",
        hideDetails:"Details ausblenden",
        showMore:"Mehr anzeigen",
        showLess:"Weniger anzeigen",
        readDescription:"Beschreibung lesen",
        openRoute:"Route öffnen",
        navigation:"Navigation",
        openMap:"Karte öffnen",
        openNavigation:"Navigation starten",
        googleMaps:"Google Maps",
        appleMaps:"Apple Karten",
        documents:"Dokumente",
        photos:"Fotos",
        hikeDetails:"Wanderdetails",
        backToCalendar:"Zurück zum Kalender",
        backToTimeline:"Zurück zur Gesamt-Timeline",
        previousItem:"Vorheriger Programmpunkt",
        nextItem:"Nächster Programmpunkt",
        openDocument:"Dokument öffnen",
        openDocumentNamed:"Dokument öffnen: {title}",
        saveTripCalendar:"Gesamtreise in Kalender speichern",
        done:"Erledigt"
      },
      status:{
        optional:"Optional",
        reserved:"Reserviert",
        confirmed:"Bestätigt",
        planned:"Geplant",
        completed:"Abgeschlossen",
        continuation:"(Fortsetzung)"
      },
      route:{
        title:"Route",
        hike:"Wanderroute",
        overview:"Wanderübersicht",
        summary:"Kurzinfo",
        loading:"Karte wird geladen …",
        unavailable:"Route nicht verfügbar",
        mapAria:"Kompakte Wanderkarte",
        interactiveMapAria:"Interaktive Routenkarte",
        elevation:"Höhenprofil",
        elevationAria:"Interaktives Höhenprofil",
        toolbarAria:"Kartenleiste",
        showLocation:"Meinen Standort zeigen",
        openGoogleMaps:"In Google Maps öffnen",
        mapNotReady:"Karte ist noch nicht geladen.",
        locationUnsupported:"Standort wird von diesem Gerät nicht unterstützt.",
        locationDetecting:"Standort wird ermittelt …",
        yourLocation:"Ihr Standort",
        locationFailed:"Standort konnte nicht ermittelt werden. Bitte Berechtigung prüfen.",
        locationActive:"Standort aktiv (nur lokal, nicht gespeichert)",
        toDestination:"{km} km bis Ziel",
        toHut:"{km} km bis nächste Hütte",
        toParking:"{km} km bis Parkplatz",
        elevationDistance:"Höhe {elevation} · Distanz {distance}",
        start:"Start",
        end:"Ziel"
      },
      calendar:{
        eyebrow:"Kalender",
        title:"Ihre Reise als Kalender",
        toolbarAria:"Kalendersteuerung",
        viewAria:"Kalenderansicht",
        tripView:"Gesamtreise",
        dayView:"Tagesansicht",
        allDay:"Ganztägig",
        exportMissing:"Keine exportierbaren Kalendertermine vorhanden.",
        exportFailed:"Kalenderdatei konnte nicht erstellt werden."
      },
      timeline:{
        eyebrow:"Gesamt-Timeline",
        title:"Alle Programmpunkte chronologisch",
        dayAria:"Tages-Timeline"
      },
      details:{
        eyebrow:"Details",
        title:"Ihr Programmpunkt"
      },
      bookings:{
        eyebrow:"Abschluss",
        title:"Bestätigte Leistungen",
        empty:"Aktuell sind keine Buchungen für Sie sichtbar."
      },
      empty:{
        calendar:"Noch keine Programmpunkte für den Kalender hinterlegt.",
        program:"Für diese Reise sind noch keine Programmpunkte hinterlegt.",
        none:"Kein Reiseplan vorhanden",
        preparing:"Ihre Reise wird vorbereitet.",
        noActivities:"Keine Aktivitäten vorhanden."
      },
      loading:{
        default:"Wird geladen …",
        refresh:"Aktualisieren",
        retry:"Erneut versuchen",
        failed:"Fehler beim Laden"
      },
      aria:{
        view:"Reiseplan",
        overview:"Reiseübersicht",
        dayNav:"Tagesnavigation",
        daySelector:"Tagesauswahl",
        documents:"Dokumente",
        accommodation:"Unterkunft",
        weather:"Wetter"
      }
    },
    documents:{
      hero:{
        eyebrow:"Alpine Concierge Tirol",
        title:"Ihre Reiseunterlagen",
        subtitle:"Alle wichtigen Dokumente an einem Ort.",
        intro:"Alle wichtigen Dokumente an einem Ort."
      },
      overview:{
        eyebrow:"Übersicht",
        title:"Ihre Kategorien",
        copy:"Tickets, Voucher und persönliche Unterlagen – übersichtlich nach Thema.",
        documents:"Dokumente",
        travelDocuments:"Reiseunterlagen",
        tickets:"Tickets",
        bookings:"Buchungen",
        invoices:"Rechnungen",
        vouchers:"Voucher",
        contracts:"Verträge",
        insurance:"Versicherung",
        travelInfo:"Reiseinformationen",
        downloads:"Downloads"
      },
      list:{
        eyebrow:"Unterlagen",
        title:"Ihre Dokumente"
      },
      notes:{
        eyebrow:"Concierge",
        title:"Fragen zu Ihren Unterlagen?",
        copy:"Fehlt ein Ticket oder Voucher, melden Sie sich einfach bei Ihrem Concierge – wir helfen gerne weiter."
      },
      categories:{
        accommodation:"Unterkunft",
        flight:"Flug",
        train:"Bahn",
        rentalCar:"Mietwagen",
        activities:"Aktivitäten",
        restaurant:"Restaurant",
        wellness:"Wellness",
        transfers:"Transfers",
        other:"Sonstiges",
        tickets:"Tickets",
        vouchers:"Voucher",
        bookings:"Buchungen",
        invoices:"Rechnungen",
        contracts:"Verträge",
        insurance:"Versicherung",
        travelInfo:"Reiseinformationen",
        travel:"Reise",
        downloads:"Downloads",
        general:"Allgemein"
      },
      types:{
        pdf:"PDF",
        image:"Bild",
        qr:"QR",
        word:"Word",
        excel:"Excel",
        ticket:"Ticket",
        file:"Datei",
        document:"Dokument"
      },
      fields:{
        fileName:"Dateiname",
        category:"Kategorie",
        fileSize:"Dateigröße",
        date:"Datum",
        note:"Hinweis",
        expiryDate:"Ablaufdatum"
      },
      actions:{
        open:"Öffnen",
        openNamed:"Dokument öffnen: {title}",
        download:"Herunterladen",
        downloadNamed:"Herunterladen: {title}",
        preview:"Vorschau",
        share:"Teilen",
        print:"Drucken",
        new:"Neu",
        updated:"Aktualisiert"
      },
      status:{
        available:"verfügbar",
        preparing:"wird vorbereitet",
        missing:"nicht vorhanden",
        archived:"archiviert"
      },
      empty:{
        title:"Keine Dokumente vorhanden",
        copy:"Sobald Unterlagen freigegeben sind, erscheinen sie hier.",
        none:"Keine Dokumente vorhanden",
        preparing:"Dokumente werden vorbereitet",
        noDownloads:"Noch keine Downloads",
        concierge:"Concierge"
      },
      loading:{
        default:"Wird geladen …",
        refresh:"Aktualisieren",
        retry:"Erneut versuchen"
      },
      errors:{
        openFailed:"Dokument konnte nicht geöffnet werden",
        downloadFailed:"Download fehlgeschlagen",
        unavailable:"Dokument nicht verfügbar"
      },
      preview:{
        caption:"Dokumentvorschau"
      },
      count:{
        one:"{count} Dokument",
        other:"{count} Dokumente"
      },
      aria:{
        view:"Dokumente",
        hero:"Reiseunterlagen",
        center:"Dokumentencenter",
        overview:"Dokumentenübersicht",
        categoryNav:"Dokumentenkategorien",
        categoryChip:"{label}: {count}",
        notes:"Hinweise zu Dokumenten",
        open:"Öffnen",
        download:"Herunterladen",
        preview:"Vorschau"
      }
    },
    service:{
      hero:{
        eyebrow:"Service",
        title:"Ihr persönlicher Concierge",
        subtitle:"Wir sind für Ihre Wünsche, Fragen und besonderen Momente an Ihrer Seite.",
        intro:"Wir sind für Ihre Wünsche, Fragen und besonderen Momente an Ihrer Seite."
      },
      overview:{
        eyebrow:"Unterstützung",
        title:"Was wir für Sie tun können",
        copy:"Direkte Hilfe zu Programm, Änderungen und praktischen Anliegen – ein Schritt genügt.",
        personalSupport:"Persönliche Unterstützung",
        weAreHere:"Wir sind für Sie da",
        individualCare:"Individuelle Betreuung",
        yourRequest:"Ihre Anfrage",
        requestService:"Service anfragen",
        getSupport:"Unterstützung erhalten",
        personalRecommendation:"Persönliche Empfehlung",
        discreetReliable:"Diskret und zuverlässig",
        duringStay:"Während Ihres Aufenthalts"
      },
      concierge:{
        eyebrow:"Concierge",
        title:"Ihr Ansprechpartner",
        personalCare:"Persönliche Betreuung",
        lead:"Wir begleiten Ihre Reise persönlich – von der ersten Frage bis zum besonderen Moment vor Ort.",
        personalConcierge:"Ihr persönlicher Concierge"
      },
      accommodation:{
        eyebrow:"Unterkunft",
        title:"Aufenthalt",
        fallbackName:"Unterkunft",
        checkIn:"Check-in",
        checkOut:"Check-out",
        contact:"Kontakt",
        voucher:"Voucher",
        notes:"Hinweise",
        openNavigation:"Navigation öffnen"
      },
      history:{
        eyebrow:"Hinweise",
        title:"Änderungsverlauf",
        copy:"Wichtige Aktualisierungen zu Ihrer Reise – chronologisch und übersichtlich.",
        publishedVersion:"Version {version} veröffentlicht"
      },
      categories:{
        travelPlanning:"Reiseplanung",
        restaurantReservation:"Restaurantreservierung",
        transfers:"Transfers",
        activities:"Aktivitäten",
        tickets:"Tickets",
        wellness:"Wellness",
        shopping:"Shopping",
        childcare:"Kinderbetreuung",
        petService:"Haustierservice",
        specialRequests:"Sonderwünsche",
        emergencySupport:"Notfallunterstützung",
        other:"Sonstiges"
      },
      actions:{
        sendRequest:"Anfrage senden",
        openWhatsApp:"WhatsApp öffnen",
        call:"Anrufen",
        email:"E-Mail schreiben",
        selectService:"Service auswählen",
        showDetails:"Details anzeigen",
        learnMore:"Mehr erfahren",
        back:"Zurück",
        close:"Schließen",
        retry:"Erneut versuchen",
        sendChange:"Änderungswunsch senden",
        confirmProgram:"Programm bestätigen",
        openPayment:"Zahlung öffnen",
        downloadPdf:"PDF herunterladen",
        print:"Drucken",
        saveCalendar:"Kalender speichern"
      },
      request:{
        title:"Worum dürfen wir uns kümmern?",
        message:"Ihre Nachricht",
        preferredTime:"Gewünschter Zeitpunkt",
        priority:"Priorität",
        contactMethod:"Kontaktweg",
        send:"Nachricht senden",
        preparing:"Anfrage wird vorbereitet",
        submitted:"Anfrage wurde übermittelt",
        failed:"Anfrage konnte nicht übermittelt werden"
      },
      form:{
        title:"Worum dürfen wir uns kümmern?",
        message:"Ihre Nachricht",
        preferredTime:"Gewünschter Zeitpunkt",
        priority:"Priorität",
        contactMethod:"Kontaktweg",
        send:"Nachricht senden"
      },
      status:{
        preparing:"Anfrage wird vorbereitet",
        submitted:"Anfrage wurde übermittelt",
        failed:"Anfrage konnte nicht übermittelt werden",
        processing:"Anfrage wird verarbeitet"
      },
      contact:{
        phone:"Telefon",
        email:"E-Mail",
        whatsapp:"WhatsApp",
        reachability:"Erreichbarkeit",
        personalContact:"Persönlicher Kontakt",
        responseTime:"Antwortzeit",
        urgentCases:"In dringenden Fällen",
        emergency:"Notfallkontakt",
        localEmergency:"Lokale Notrufnummern"
      },
      empty:{
        hotel:"Ihre Unterkunftsdaten werden gerade vorbereitet und erscheinen hier, sobald sie freigegeben sind.",
        care:"Ihre persönliche Betreuung wird gerade vorbereitet.",
        historyTitle:"Noch keine Änderungen notiert",
        historyCopy:"Sobald es Aktualisierungen zu Ihrer Reise gibt, erscheinen sie hier.",
        noServices:"Noch keine Services vorhanden",
        preparing:"Ihre Serviceangebote werden vorbereitet",
        noRecommendation:"Aktuell keine Empfehlung verfügbar",
        contactConcierge:"Bitte kontaktieren Sie Ihren Concierge"
      },
      loading:{
        default:"Wird geladen …",
        processing:"Anfrage wird verarbeitet",
        refresh:"Aktualisieren",
        retry:"Erneut versuchen"
      },
      errors:{
        loadFailed:"Daten konnten nicht geladen werden",
        actionFailed:"Aktion fehlgeschlagen",
        retry:"Bitte versuchen Sie es erneut",
        unavailable:"Service derzeit nicht verfügbar",
        submitFailed:"Anfrage konnte nicht übermittelt werden"
      },
      wish:{
        eyebrow:"Concierge",
        title:"Mein Wunsch",
        subtitle:"Erzähl uns, was wir für dich organisieren dürfen.",
        start:"Wunsch starten",
        loginHint:"Bitte melde dich in deinem persönlichen Kundenportal an, um uns einen Wunsch zu senden.",
        login:"Zum persönlichen Login",
        listTitle:"Deine Wünsche",
        listEmpty:"Du hast uns noch keinen Wunsch gesendet.",
        followUpLead:"Wir haben deinen Wunsch bereits aufgenommen. Damit wir ihn passend für dich zusammenstellen können, hätten wir noch ein paar kurze Rückfragen.",
        followUpEmptyLead:"Dein Concierge hat deinen Wunsch bereits im Blick.",
        followUpEmpty:"Aktuell haben wir keine offenen Rückfragen für dich.",
        followUpListTitle:"Offene Rückfragen",
        followUpStart:"Rückfragen beantworten",
        followUpCount:"{count} offene Fragen",
        followUpStatus:"Wir warten auf deine Angaben",
        followUpProgress:"Deine Rückfragen · {step} von {total}",
        followUpProgressReview:"Deine Rückfragen",
        reviewCheck:"Antworten prüfen",
        sendAnswers:"Antworten an Alpine Concierge senden",
        sending:"Antworten werden gesendet …",
        submitSuccess:"Danke, {name}. Deine Antworten sind bei uns angekommen. Wir sehen uns deine Angaben persönlich an und melden uns bei dir.",
        submitSuccessAnonymous:"Danke. Deine Antworten sind bei uns angekommen. Wir sehen uns deine Angaben persönlich an und melden uns bei dir.",
        submitFailed:"Deine Antworten konnten gerade nicht gesendet werden. Bitte versuche es erneut.",
        submitAuth:"Bitte melde dich erneut in deinem persönlichen Kundenportal an.",
        submitChanged:"Dieser Wunsch wurde inzwischen geändert. Bitte lade deine offenen Rückfragen neu.",
        reloadFollowUps:"Aktuelle Rückfragen laden",
        followUpThanksEmpty:"Danke – aktuell haben wir keine weiteren offenen Rückfragen für dich.",
        progress:"Dein Wunsch · Schritt {step}",
        next:"Weiter",
        back:"Zurück",
        close:"Schließen",
        confirmDiscard:"Deine Angaben gehen verloren. Dialog wirklich schließen?",
        ideaHint:"Du musst noch keinen fertigen Plan haben. Erzähl uns einfach, was du dir ungefähr vorstellst – wir kümmern uns um die Ausarbeitung.",
        ideaLabel:"Deine Idee",
        ideaPlaceholder:"Was schwebt dir vor?",
        adultsLabel:"Erwachsene",
        childrenLabel:"Kinder",
        childAgesLabel:"Alter der Kinder",
        childAgeLabel:"Alter Kind {n}",
        yes:"Ja",
        no:"Nein",
        edit:"Wunsch bearbeiten",
        send:"Wunsch an Alpine Concierge senden",
        sendPending:"Übermittlung wird im nächsten Schritt angebunden.",
        occasionForWhom:"Für wen ist der Anlass?",
        occasionSurprise:"Soll es eine Überraschung bleiben?",
        dateLabel:"Datum",
        dateFromLabel:"Von",
        dateToLabel:"Bis",
        datesLabel:"Mögliche Tage",
        addDate:"Tag hinzufügen",
        stayPeriodHint:"{range}",
        excludedTitle:"Gibt es Tage, an denen es nicht möglich ist?",
        excludedHint:"Freiwillig. Alpine Concierge wählt dann einen anderen passenden Tag.",
        excludedDatesLabel:"Nicht mögliche Tage",
        addExcludedDate:"Tag ausschließen",
        or:"oder",
        dayTimeTitle:"Tageszeit",
        durationTitle:"Dauer",
        stayTitle:"Ausgangspunkt",
        profileStay:"Mein Aufenthaltsort",
        otherStart:"Anderer Ausgangspunkt",
        customStartLabel:"Anderer Ausgangspunkt",
        radiusTitle:"Wie weit dürfen wir für ein besonderes Erlebnis fahren?",
        mobilityTitle:"Mobilität",
        avoidTitle:"Was möchtest du eher vermeiden?",
        experienceTitle:"Erfahrungsniveau",
        equipmentTitle:"Ausrüstung",
        allergiesLabel:"Allergien / Unverträglichkeiten",
        atmosphereLabel:"Gewünschte Atmosphäre",
        settingTitle:"Umgebung",
        privacyTitle:"Besondere Privatsphäre gewünscht",
        privacyYes:"besondere Privatsphäre gewünscht",
        attendeesLabel:"Teilnehmerzahl",
        takeawayLabel:"Was sollen deine Gäste von Tirol mitnehmen?",
        budgetScopeTitle:"Budgetrahmen",
        specialDetailLabel:"Details zu {label}",
        notesLabel:"Was sollten wir noch über deinen Wunsch wissen?",
        limits:{
          category:"Du kannst nicht noch mehr Themen wählen.",
          mood:"Du kannst höchstens 5 Stimmungen wählen.",
          priority:"Du kannst höchstens 3 Prioritäten wählen."
        },
        step:{
          categories:"Worum dürfen wir uns kümmern?",
          idea:"Erzähl uns von deiner Idee.",
          participants:"Für wen dürfen wir planen?",
          occasion:"Gibt es einen besonderen Anlass?",
          timing:"Wann möchtest du deinen Wunsch erleben?",
          location:"Ausgangspunkt",
          mood:"Wie soll es sich für dich anfühlen?",
          activity:"Wie aktiv darf es werden?",
          culinary:"Kulinarik",
          wellness:"Wellness",
          business:"Business",
          budget:"In welchem Rahmen dürfen wir für dich planen?",
          priorities:"Was zählt für dich am meisten?",
          specialRequirements:"Besondere Anforderungen",
          conciergeMode:"Wie möchtest du von uns begleitet werden?",
          additionalNotes:"Was sollten wir noch über deinen Wunsch wissen?",
          review:"Dein Wunsch auf einen Blick",
          followUpReview:"Deine Angaben auf einen Blick",
          desiredMood:"Wie soll es sich für dich anfühlen?"
        },
        occasion:{
          none:"Nein",
          birthday:"Geburtstag",
          anniversary:"Hochzeitstag / Jahrestag",
          proposal:"Heiratsantrag",
          wedding:"Hochzeit",
          surprise:"Überraschung",
          "family-celebration":"Familienfeier",
          business:"Business-Anlass",
          gift:"Geschenk",
          reunion:"Wiedersehen",
          other:"Sonstiges"
        },
        timing:{
          date:"Bestimmter Tag",
          stay:"Während meines Aufenthalts",
          range:"Zeitraum",
          "several-days":"Mehrere mögliche Tage",
          flexible:"Ich bin flexibel",
          not_decided:"Noch nicht festgelegt"
        },
        dayTime:{
          morning:"Vormittag",
          midday:"Mittag",
          afternoon:"Nachmittag",
          evening:"Abend",
          "full-day":"ganzer Tag",
          flexible:"flexibel"
        },
        duration:{
          "1-2h":"1–2 Stunden",
          "2-4h":"2–4 Stunden",
          "half-day":"halber Tag",
          "full-day":"ganzer Tag",
          "several-days":"mehrere Tage",
          open:"offen"
        },
        radius:{
          nearby:"möglichst in der Nähe",
          "30min":"bis ca. 30 Minuten",
          "60min":"bis ca. 1 Stunde",
          further:"auch weiter, wenn es sich lohnt",
          any:"egal"
        },
        mobility:{
          "own-car":"eigenes Auto",
          rental:"Mietwagen",
          public:"öffentliche Verkehrsmittel",
          transfer:"Transfer / Chauffeur gewünscht",
          open:"offen"
        },
        mood:{
          exclusive:"exklusiv",
          authentic:"authentisch",
          extraordinary:"außergewöhnlich",
          romantic:"romantisch",
          adventurous:"abenteuerlich",
          relaxed:"entspannt",
          "nature-connected":"naturverbunden",
          regional:"regional",
          luxurious:"luxuriös",
          sporty:"sportlich",
          sociable:"gesellig",
          quiet:"ruhig",
          private:"privat",
          inspiring:"inspirierend",
          "family-friendly":"familienfreundlich",
          offbeat:"abseits des Üblichen",
          "typical-tirol":"typisch Tirol"
        },
        avoidance:{
          crowds:"Menschenmengen",
          "tourist-hotspots":"touristische Hotspots",
          "long-drives":"lange Autofahrten",
          "physical-strain":"große körperliche Anstrengung",
          formal:"formelle Atmosphäre",
          "early-start":"frühes Aufstehen",
          "long-hikes":"lange Wanderungen",
          altitude:"Höhe",
          none:"nichts davon",
          other:"Sonstiges"
        },
        activityLevel:{
          "very-relaxed":"sehr gemütlich",
          "lightly-active":"leicht aktiv",
          active:"aktiv",
          sporty:"sportlich",
          demanding:"anspruchsvoll",
          any:"egal"
        },
        activityExperience:{
          beginner:"Anfänger",
          occasional:"gelegentlich",
          experienced:"erfahren",
          "very-experienced":"sehr erfahren"
        },
        activityEquipment:{
          own:"eigene Ausrüstung",
          needed:"Ausrüstung benötigt",
          unknown:"weiß ich noch nicht"
        },
        culinary:{
          tyrolean:"Tiroler Küche",
          "fine-dining":"Fine Dining",
          modern:"modern / kreativ",
          international:"international",
          traditional:"traditionell",
          vegetarian:"vegetarisch",
          vegan:"vegan",
          wine:"Wein",
          "private-dining":"Private Dining",
          hut:"Alm / Hütte",
          "extraordinary-location":"außergewöhnliche Location",
          surprise:"überraschen lassen"
        },
        wellness:{
          "day-spa":"Day Spa",
          massage:"Massage / Behandlung",
          sauna:"Sauna / Wellness",
          "private-spa":"Private Spa",
          retreat:"Ruhe & Rückzug",
          beauty:"Beauty",
          "special-hotel":"besonderes Hotel",
          "special-overnight":"außergewöhnliche Übernachtung",
          open:"offen"
        },
        wellnessSetting:{
          indoor:"Indoor",
          outdoor:"Outdoor",
          any:"egal"
        },
        business:{
          meeting:"Geschäftstreffen",
          "client-care":"Kundenbetreuung",
          "team-event":"Teamevent",
          "business-dinner":"Geschäftsessen",
          incentive:"Incentive",
          "supporting-program":"Rahmenprogramm",
          "international-guests":"internationale Gäste",
          transfer:"Transfer",
          other:"Sonstiges"
        },
        budget:{
          "up-to-100":"bis 100 € p. P.",
          "100-250":"100–250 € p. P.",
          "250-500":"250–500 € p. P.",
          "500-1000":"500–1.000 € p. P.",
          "over-1000":"über 1.000 € p. P.",
          open:"offen – das Erlebnis entscheidet",
          "consult-first":"zuerst beraten lassen"
        },
        budgetScope:{
          per_person:"pro Person",
          total:"Gesamtbudget"
        },
        priority:{
          uniqueness:"Einzigartigkeit",
          quality:"Qualität",
          privacy:"Privatsphäre",
          authenticity:"Authentizität",
          price:"Preis",
          comfort:"Komfort",
          regionality:"Regionalität",
          flexibility:"Flexibilität",
          exclusivity:"Exklusivität",
          availability:"spontane Verfügbarkeit",
          "child-friendly":"Kinderfreundlichkeit",
          sustainability:"Nachhaltigkeit"
        },
        special:{
          diet:"Ernährung / Allergien",
          "limited-mobility":"eingeschränkte Mobilität",
          accessibility:"Barrierefreiheit",
          stroller:"Kinderwagen",
          pet:"Haustier",
          "fear-of-heights":"Höhenangst",
          physical:"besondere körperliche Anforderungen",
          discretion:"besondere Diskretion",
          none:"keine"
        },
        concierge:{
          ideas:"Ideen gesucht",
          compose:"Stellt etwas für mich zusammen",
          organize:"Ich weiß ziemlich genau, was ich möchte",
          surprise:"Überrascht mich"
        },
        conciergeLead:{
          ideas:"Ich möchte zunächst Vorschläge bekommen.",
          compose:"Ich gebe euch meine Wünsche – ihr entwickelt daraus das Erlebnis.",
          organize:"Ich brauche Unterstützung bei Organisation und Reservierung.",
          surprise:"Ihr dürft kreativ werden."
        },
        review:{
          categories:"Worum geht es",
          idea:"Deine Idee",
          participants:"Für wen",
          occasion:"Anlass",
          timing:"Wann",
          timingStay:"Während deines Aufenthalts · {range}",
          timingExcluded:"Nicht möglich: {dates}",
          timingPreferred:"Bevorzugt: {times}",
          timingFlexible:"Flexibel – Alpine Concierge darf den passenden Tag auswählen.",
          timingOpen:"Noch nicht festgelegt.",
          location:"Ausgangspunkt & Mobilität",
          mood:"So soll es sich anfühlen",
          avoidances:"Was du vermeiden möchtest",
          activity:"Aktivität",
          culinary:"Kulinarik",
          wellness:"Wellness",
          business:"Business",
          budget:"Budget",
          priorities:"Prioritäten",
          special:"Besondere Anforderungen",
          concierge:"Art der Begleitung",
          notes:"Zusatz"
        },
        category:{
          "individual-experience":"Individuelles Erlebnis",
          culinary:"Kulinarik & Genuss",
          nature:"Natur & Berge",
          sport:"Sport & Aktiv",
          wellness:"Wellness & Entspannung",
          culture:"Kultur & Events",
          shopping:"Shopping & Besonderes finden",
          transfer:"Transfer & Mobilität",
          business:"Business & Treffen",
          occasion:"Besonderer Anlass",
          family:"Familie & Kinder",
          "surprise-me":"Überrasch mich",
          other:"Etwas anderes"
        },
        participant:{
          solo:"Nur für mich",
          couple:"Paar",
          family:"Familie",
          friends:"Freunde",
          business:"Geschäftspartner / Kollegen",
          group:"Gruppe",
          "surprise-other":"Überraschung für jemand anderen"
        },
        errors:{
          categoryRequired:"Bitte wähle mindestens ein Thema.",
          ideaRequired:"Bitte erzähl uns von deiner Idee.",
          ideaTooLong:"Die Idee ist zu lang.",
          participantRequired:"Bitte angeben, für wen geplant werden soll.",
          adultsInvalid:"Bitte eine gültige Anzahl Erwachsener angeben.",
          childrenInvalid:"Bitte eine gültige Anzahl Kinder angeben.",
          childAgesInvalid:"Bitte das Alter der Kinder angeben.",
          occasionRequired:"Bitte den Anlass angeben.",
          occasionForWhom:"Die Angabe „Für wen?“ ist zu lang.",
          timingMode:"Bitte den Zeitraum angeben.",
          timingDate:"Bitte ein Datum angeben.",
          timingRange:"Bitte einen Zeitraum angeben.",
          timingStay:"Ohne hinterlegten Aufenthalt können wir diesen Modus nicht verwenden.",
          timingOrder:"Das Enddatum liegt vor dem Startdatum.",
          timingDates:"Bitte mindestens einen möglichen Tag angeben.",
          timingExcluded:"Ausgeschlossene Tage müssen innerhalb des Zeitraums liegen.",
          timingDayTime:"Bitte eine Tageszeit angeben.",
          timingDuration:"Bitte die gewünschte Dauer angeben.",
          travelRadius:"Bitte die akzeptierte Anfahrt angeben.",
          mobility:"Bitte die Mobilität angeben.",
          customStart:"Bitte den anderen Ausgangspunkt angeben.",
          moodLimit:"Bitte höchstens 5 Stimmungen wählen.",
          activityLevel:"Bitte das Aktivitätsniveau angeben.",
          attendees:"Bitte eine gültige Teilnehmerzahl angeben.",
          budget:"Bitte einen Budgetrahmen angeben.",
          priorityLimit:"Bitte höchstens 3 Prioritäten wählen.",
          specialRequired:"Bitte besondere Anforderungen angeben oder „keine“ wählen.",
          conciergeMode:"Bitte die gewünschte Begleitung angeben.",
          notesTooLong:"Die Abschlussnotiz ist zu lang.",
          followUpRequired:"Bitte diese Frage beantworten.",
          generic:"Bitte prüfe deine Angaben in diesem Schritt."
        }
      },
      aria:{
        view:"Service",
        hero:"Service",
        contact:"Concierge-Kontakt",
        accommodation:"Unterkunft",
        actions:"Serviceaktionen",
        history:"Änderungsverlauf",
        wish:"Mein Wunsch",
        wishWizard:"Wunsch formulieren",
        wishStart:"Wunsch starten",
        wishList:"Deine Wünsche",
        wishLogin:"Zum persönlichen Login",
        openWhatsApp:"WhatsApp öffnen",
        call:"Anrufen",
        email:"E-Mail schreiben"
      }
    },
    discover:{
      hero:{
        eyebrow:"Concierge",
        title:"Entdecken",
        subtitle:"Besondere Empfehlungen für Ihren Aufenthalt.",
        intro:"Besondere Empfehlungen für Ihren Aufenthalt."
      },
      overview:{
        eyebrow:"Auswahl",
        title:"Empfehlungen",
        personal:"Persönlich",
        themes:"Themen",
        categoriesTitle:"Ihre Kategorien",
        region:"Region",
        surroundings:"Ihre Umgebung",
        selectedForYou:"Persönlich für Sie ausgewählt",
        ourRecommendations:"Unsere Empfehlungen",
        specialExperiences:"Besondere Erlebnisse",
        discoverTirol:"Entdecken Sie Tirol",
        curatedForYou:"Für Sie kuratiert",
        nearby:"In Ihrer Nähe",
        recommendedToday:"Heute empfohlen",
        matchingTrip:"Passend zu Ihrer Reise"
      },
      concierge:{
        eyebrow:"Concierge",
        insiderTip:"Insider-Tipp",
        recommendation:"Empfehlung Ihres Concierge",
        curated:"Für Sie kuratiert"
      },
      recommendations:{
        featuredTitle:"Heute empfehlen wir",
        featuredEyebrow:"Heute empfehlen wir…",
        regionCopy:"Persönlich ausgewählte Impulse rund um Ihren Aufenthaltsort – ruhig, regional und auf Ihre Reise abgestimmt.",
        regionFallback:"Ihre Region",
        surroundingsEyebrow:"Umgebung"
      },
      categories:{
        culinary:"Kulinarik",
        restaurants:"Restaurants",
        restaurant:"Restaurant",
        nature:"Natur",
        hiking:"Wandern",
        hike:"Wandern",
        mountains:"Berge",
        culture:"Kultur",
        sights:"Sehenswürdigkeiten",
        wellness:"Wellness",
        family:"Familie",
        children:"Kinder",
        shopping:"Shopping",
        sport:"Sport",
        winter:"Winter",
        summer:"Sommer",
        events:"Veranstaltungen",
        event:"Events",
        tips:"Geheimtipps",
        tip:"Tipp",
        excursions:"Ausflüge",
        other:"Sonstiges",
        general:"Allgemein",
        viewpoint:"Aussicht",
        evening:"Abend",
        indoor:"Indoor",
        warning:"Hinweis",
        transport:"Transfer",
        activity:"Aktivität",
        recommendation:"Empfehlung"
      },
      cards:{
        learnMore:"Mehr erfahren",
        showDetails:"Details anzeigen",
        openRoute:"Route öffnen",
        openMap:"Karte öffnen",
        openWebsite:"Website öffnen",
        call:"Anrufen",
        email:"E-Mail schreiben",
        requestReservation:"Reservierung anfragen",
        addToItinerary:"Zum Reiseplan hinzufügen",
        favorite:"Favorit",
        recommended:"Empfohlen",
        new:"Neu"
      },
      actions:{
        learnMore:"Mehr erfahren",
        navigation:"Navigation",
        openRegionMaps:"Region in Maps öffnen",
        startNavigation:"Navigation starten",
        showDetails:"Details anzeigen",
        openRoute:"Route öffnen",
        openMap:"Karte öffnen",
        openWebsite:"Website öffnen",
        call:"Anrufen",
        email:"E-Mail schreiben",
        requestReservation:"Reservierung anfragen",
        addToItinerary:"Zum Reiseplan hinzufügen"
      },
      labels:{
        distance:"Entfernung",
        openingHours:"Öffnungszeiten",
        duration:"Dauer",
        price:"Preis",
        suitableFor:"Geeignet für",
        note:"Hinweis",
        recommendation:"Empfehlung"
      },
      status:{
        favorite:"Favorit",
        recommended:"Empfohlen",
        new:"Neu"
      },
      filters:{
        all:"Alle",
        categories:"Kategorien",
        nearby:"In der Nähe",
        forToday:"Für heute",
        forFamilies:"Für Familien",
        badWeather:"Bei Schlechtwetter",
        free:"Kostenlos",
        open:"Geöffnet",
        reset:"Zurücksetzen",
        results:"Ergebnisse",
        noMatches:"Keine Treffer"
      },
      navigation:{
        all:"Alle",
        categories:"Kategorien",
        results:"Ergebnisse"
      },
      map:{
        title:"Karte",
        location:"Standort",
        loading:"Karte wird geladen",
        locationUnavailable:"Standort nicht verfügbar"
      },
      route:{
        title:"Route",
        startNavigation:"Navigation starten",
        unavailable:"Route nicht verfügbar"
      },
      empty:{
        title:"Noch keine Empfehlungen",
        copy:"Persönliche Tipps erscheinen hier, sobald sie freigegeben sind.",
        none:"Noch keine Empfehlungen vorhanden",
        preparing:"Ihre Empfehlungen werden vorbereitet",
        noMatch:"Aktuell keine passenden Erlebnisse gefunden",
        conciergePreparing:"Ihr Concierge stellt persönliche Vorschläge für Sie zusammen",
        noResults:"Keine Ergebnisse für diese Auswahl"
      },
      loading:{
        default:"Wird geladen …",
        preparing:"Empfehlungen werden vorbereitet",
        refresh:"Aktualisieren",
        retry:"Erneut versuchen"
      },
      errors:{
        loadFailed:"Daten konnten nicht geladen werden",
        unavailable:"Empfehlung nicht verfügbar",
        actionFailed:"Aktion fehlgeschlagen",
        retry:"Bitte versuchen Sie es erneut"
      },
      aria:{
        view:"Entdecken",
        hero:"Entdecken",
        featured:"Persönliche Empfehlung",
        categories:"Kategorien",
        list:"Empfehlungen",
        region:"Ihre Umgebung",
        categoryChip:"{label}: {count}",
        learnMore:"Mehr erfahren",
        navigation:"Navigation"
      }
    },
    errors:{
      notFound:{
        title:"Portal nicht gefunden",
        copy:"Bitte prüfen Sie Ihren persönlichen Link oder kontaktieren Sie Alpine Concierge Tirol direkt."
      },
      shareUnavailable:{
        title:"Portal nicht verfügbar",
        copy:"Dieser Portal-Link ist nicht gültig oder nicht mehr verfügbar."
      },
      invalidLink:{
        title:"Link nicht gültig",
        copy:"Dieser Zugangslink ist nicht gültig. Bitte verwenden Sie Ihren persönlichen Portal-Link."
      },
      accessDisabled:{
        title:"Zugang nicht verfügbar",
        copy:"Dieser Portalzugang ist derzeit nicht verfügbar. Bitte wenden Sie sich an Alpine Concierge Tirol."
      },
      sessionExpired:{
        title:"Sitzung abgelaufen",
        copy:"Ihre Sitzung ist abgelaufen. Bitte melden Sie sich erneut an."
      },
      temporarilyUnavailable:"Portal-Zugang ist vorübergehend nicht verfügbar.",
      documentUnavailable:"Dokument nicht verfügbar"
    },
    aria:{
      header:"Kundenportal Kopfbereich",
      language:"Sprache",
      weather:"Wetter",
      documents:"Dokumente",
      interactiveRouteMap:"Interaktive Routenkarte",
      compactHikeMap:"Kompakte Wanderkarte",
      elevationProfile:"Interaktives Höhenprofil",
      mapToolbar:"Kartenleiste",
      daySelector:"Tagesauswahl",
      calendarControls:"Kalendersteuerung",
      calendarView:"Kalenderansicht"
    },
    date:{
      today:"heute"
    },
    inquiry:{
      title:"Ihr persönlicher Wunsch",
      intro:"Damit wir etwas Passendes für Sie zusammenstellen können, haben wir noch einige kurze Fragen.",
      loading:"Ihr persönlicher Wunsch wird geladen …",
      invalid:"Dieser persönliche Link ist nicht mehr gültig. Bitte kontaktieren Sie Alpine Concierge Tirol, wenn Sie weitere Unterstützung wünschen.",
      success:"Vielen Dank. Ihre Angaben sind bei uns angekommen. Wir sehen uns Ihre Wünsche persönlich an und melden uns bei Ihnen.",
      successTitle:"Vielen Dank",
      checkAnswers:"Bitte prüfen Sie Ihre Angaben.",
      required:"Pflichtangabe",
      optional:"optional",
      sending:"Ihre Angaben werden gesendet …",
      next:"Weiter",
      reviewNext:"Antworten prüfen",
      back:"Zurück",
      send:"Antworten an Alpine Concierge senden",
      edit:"Wunsch bearbeiten",
      unconfirmedTitle:"Ihre Angaben",
      unconfirmed:"Wir konnten den Eingang Ihrer Angaben gerade nicht eindeutig bestätigen. Bitte öffnen Sie den Link nicht mehrfach und kontaktieren Sie Alpine Concierge Tirol, falls Sie unsicher sind.",
      contact:"Alpine Concierge Tirol kontaktieren",
      documentTitle:"Ihr persönlicher Wunsch | Alpine Concierge Tirol",
      linkTitle:"Persönlicher Link"
    }
  };
})();
