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
      brand:"Alpine Concierge Tirol",
      whatsappOpen:"WhatsApp öffnen",
      contactWhatsApp:"Alpine Concierge Tirol kontaktieren",
      showAllFields:"Alle Felder anzeigen",
      version:"Version {version}",
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
        weather:"Wetter wird geladen …"
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
        welcome:"Willkommen {name}",
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
        openGoogleMaps:"In Google Maps öffnen"
      },
      calendar:{
        eyebrow:"Kalender",
        title:"Ihre Reise als Kalender",
        toolbarAria:"Kalendersteuerung",
        viewAria:"Kalenderansicht",
        tripView:"Gesamtreise",
        dayView:"Tagesansicht",
        allDay:"Ganztägig"
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
      hero:{title:"Ihr persönlicher Concierge"},
      empty:{
        hotel:"Ihre Unterkunftsdaten werden gerade vorbereitet und erscheinen hier, sobald sie freigegeben sind.",
        care:"Ihre persönliche Betreuung wird gerade vorbereitet.",
        historyTitle:"Noch keine Änderungen notiert",
        historyCopy:"Sobald es Aktualisierungen zu Ihrer Reise gibt, erscheinen sie hier."
      }
    },
    discover:{
      hero:{title:"Entdecken"},
      empty:{
        title:"Noch keine Empfehlungen",
        copy:"Persönliche Tipps erscheinen hier, sobald sie freigegeben sind."
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
    }
  };
})();
