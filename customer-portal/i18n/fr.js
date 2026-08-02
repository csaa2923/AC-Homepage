/**
 * Ops Ready 5.0A/B.1 – Textes UI français (même structure de clés que de).
 */
(function(){
  "use strict";
  window.ACTPortalI18nCatalogs=window.ACTPortalI18nCatalogs||{};
  window.ACTPortalI18nCatalogs.fr={
    navigation:{
      today:"Aujourd'hui",
      itinerary:"Itinéraire",
      itineraryShort:"Voyage",
      documents:"Documents",
      service:"Service",
      discover:"Découvrir",
      mainAria:"Navigation principale",
      appAria:"Navigation de l'application"
    },
    language:{
      label:"Langue",
      de:"Allemand",
      en:"Anglais",
      it:"Italien",
      fr:"Français"
    },
    common:{
      open:"Ouvrir",
      close:"Fermer",
      loading:"Chargement …",
      print:"Imprimer",
      download:"Télécharger",
      error:"Une erreur s'est produite.",
      retry:"Réessayer",
      notAvailable:"Non disponible",
      secureNote:"Cette page est accessible uniquement via votre lien personnel.",
      brand:"Alpine Concierge Tirol",
      guest:"Invité",
      whatsappOpen:"Ouvrir WhatsApp",
      contactWhatsApp:"Contacter Alpine Concierge Tirol",
      showAllFields:"Afficher tous les champs",
      version:"Version {version}",
      messages:{
        whatsappQuestion:"Bonjour Alpine Concierge Tirol, j'ai une question concernant mon programme de voyage.",
        whatsappChange:"Bonjour Alpine Concierge Tirol, je souhaite demander une modification de mon programme de voyage."
      },
      alerts:{
        confirmThanks:"Merci. La confirmation réelle sera connectée dans une étape ultérieure.",
        paymentLater:"Le paiement sera connecté dans une étape ultérieure.",
        pdfLater:"La génération PDF sera connectée dans une étape ultérieure.",
        documentPlaceholder:"{name} : Espace réservé document pour l'étape 1.",
        calendarMissing:"Aucun événement de calendrier exportable disponible.",
        calendarFailed:"Le fichier calendrier n'a pas pu être créé."
      },
      actions:{
        showDetails:"Voir les détails",
        openNavigation:"Ouvrir la navigation",
        openMaps:"Ouvrir la carte",
        openRoute:"Ouvrir l'itinéraire",
        call:"Appeler",
        email:"Écrire un e-mail",
        openWhatsApp:"Ouvrir WhatsApp",
        openDocuments:"Ouvrir les documents",
        openItinerary:"Ouvrir l'itinéraire",
        showMore:"Afficher plus",
        showLess:"Afficher moins",
        close:"Fermer",
        retry:"Réessayer"
      },
      loading:{
        default:"Chargement …",
        preparing:"Préparation des données …",
        weather:"Chargement de la météo …",
        portalTitle:"Chargement des données …",
        tripPreparing:"Votre programme de voyage personnel est en préparation."
      },
      errors:{
        loadFailed:"Les données n'ont pas pu être chargées.",
        connectionFailed:"Échec de la connexion.",
        updateFailed:"Échec de la mise à jour.",
        unavailable:"Indisponible"
      },
      status:{
        published:"Publié"
      }
    },
    today:{
      hero:{
        eyebrow:"Alpine Concierge Tirol",
        title:"Bienvenue",
        welcome:"Bienvenue, {name}",
        subtitle:"Votre accompagnateur de voyage personnel pour aujourd'hui."
      },
      focusAria:"Aujourd'hui en un coup d'œil",
      overview:{
        title:"Votre journée en un coup d'œil",
        schedule:"Programme du jour",
        next:"Prochain point du programme",
        further:"Autres points du programme",
        noFurther:"Aucun autre point du programme"
      },
      schedule:{
        eyebrow:"À venir",
        title:"Prochain point du programme",
        allDay:"Toute la journée",
        start:"Début",
        end:"Fin",
        duration:"Durée",
        meetingPoint:"Point de rendez-vous",
        location:"Lieu",
        notes:"Notes",
        details:"Détails",
        today:"Aujourd'hui",
        tomorrow:"Demain",
        time:"Heure"
      },
      labels:{
        tripPeriod:"Période de voyage",
        region:"Région",
        companions:"Compagnons de voyage",
        tripStatus:"Statut du voyage",
        countdown:"Compte à rebours",
        concierge:"Concierge",
        customerNumber:"Numéro client",
        portal:"Portail",
        publication:"Publication"
      },
      actions:{
        showDetails:"Voir les détails",
        openNavigation:"Ouvrir la navigation",
        missingStart:"Aucun point de départ disponible"
      },
      quick:{
        eyebrow:"Accès rapide",
        title:"Continuer",
        itinerary:"Itinéraire",
        documents:"Documents",
        contact:"Contact",
        whatsapp:"WhatsApp"
      },
      concierge:{
        eyebrow:"Concierge",
        title:"Important aujourd'hui",
        personal:"Votre concierge personnel",
        personalAria:"Concierge personnel",
        currentHintsAria:"Notes actuelles",
        timeline:"Timeline du concierge",
        timelineAria:"Timeline du jour",
        liveStatus:"Statut du voyage en direct",
        liveStatusAria:"Statut du voyage en direct",
        badWeather:"Alternatives par mauvais temps",
        badWeatherAria:"Alternatives par mauvais temps",
        evening:"Ce soir, nous recommandons…",
        eveningAria:"Recommandation du soir",
        profile:"Profil de voyage : {label}",
        greetingFallback:"Bienvenue"
      },
      weather:{
        eyebrow:"Météo",
        title:"Météo actuelle",
        cardTitle:"Météo de voyage",
        forLocation:"Météo pour :",
        loadingTitle:"Chargement de la météo en direct …",
        loadingCopy:"Les données proviennent directement d'Open-Meteo pour votre période de voyage.",
        unavailableTitle:"Aucune prévision fiable",
        unavailable:"Données météo indisponibles",
        loadFailed:"Les données météo n'ont pas pu être chargées.",
        source:"Source : Open-Meteo",
        sourceUnavailable:"Source : Open-Meteo (indisponible)",
        coordinates:"Coordonnées : {coords}",
        updated:"Mis à jour : {time}",
        noLocation:"Aucun lieu météo défini",
        notSet:"Non défini",
        rain:"Pluie : {value} %",
        precipitation:"Précipitations : {value} mm",
        wind:"Vent : {value} km/h",
        tempRange:"{min}°C à {max}°C",
        tooFar:"Une prévision météo est disponible à partir de 16 jours avant le début du voyage ({date}).",
        rangeUnavailable:"Aucune prévision n'est actuellement disponible pour votre période de voyage.",
        partialBoth:"Affiche la fenêtre de prévision disponible au sein de votre voyage ({start} à {end}).",
        partialPast:"À partir d'aujourd'hui ({start}) jusqu'à la fin du voyage, dans la mesure où une prévision est disponible.",
        partialFuture:"Prévision jusqu'au {end}. D'autres jours suivront à l'approche de votre voyage.",
        codes:{
          0:"Clair",
          1:"Principalement ensoleillé",
          2:"Partiellement nuageux",
          3:"Nuageux",
          45:"Brouillard",
          48:"Brouillard givrant",
          51:"Bruine légère",
          53:"Bruine",
          55:"Bruine forte",
          61:"Pluie légère",
          63:"Pluie",
          65:"Pluie forte",
          71:"Neige légère",
          73:"Neige",
          75:"Neige forte",
          80:"Averses de pluie",
          81:"Averses",
          82:"Fortes averses",
          95:"Orage",
          fallback:"Données météo"
        },
        clothing:{
          rain:"Prévoyez une veste de pluie et des chaussures imperméables.",
          cold:"Emportez des couches chaudes et une veste coupe-vent.",
          wind:"Une veste coupe-vent est recommandée.",
          hot:"Protection solaire et vêtements légers sont recommandés.",
          layers:"Des vêtements confortables en couches sont idéaux."
        }
      },
      status:{
        eyebrow:"Informations complémentaires",
        title:"Où en êtes-vous",
        label:"Statut du voyage : {status}",
        updated:"Dernière mise à jour : {date}",
        defaultStatus:"Pas encore défini",
        steps:{
          inquiryReceived:"Demande reçue",
          offerCreated:"Offre créée",
          offerSent:"Offre envoyée",
          offerConfirmed:"Offre confirmée",
          paymentOpen:"Paiement en attente",
          depositReceived:"Acompte reçu",
          fullyPaid:"Entièrement payé",
          programInProgress:"Programme en cours",
          programPublished:"Programme publié",
          tripOngoing:"Voyage en cours",
          tripCompleted:"Voyage terminé"
        }
      },
      countdown:{
        pending:"Date à venir",
        daysUntil:"{count} jours avant le début du voyage",
        tomorrow:"Votre voyage commence demain",
        today:"Votre voyage commence aujourd'hui",
        past:"La période de voyage est déjà passée"
      },
      next:{
        empty:"Aucun prochain point du programme n'est disponible pour le moment."
      },
      empty:{
        noSchedule:"Rien n'est encore prévu pour aujourd'hui.",
        preparing:"Vos contenus sont en cours de préparation.",
        noHints:"Aucune note disponible.",
        noWeather:"Aucune donnée météo disponible.",
        noNext:"Aucun prochain point du programme"
      },
      aria:{
        focus:"Aujourd'hui en un coup d'œil",
        weather:"Météo",
        nextEvent:"Prochain point du programme",
        concierge:"Concierge",
        quickActions:"Accès rapide",
        status:"Statut du voyage"
      }
    },
    itinerary:{
      hero:{
        eyebrow:"Alpine Concierge Tirol",
        title:"Itinéraire",
        subtitle:"Votre accompagnateur de voyage personnel – jour après jour."
      },
      overview:{
        aria:"Aperçu du voyage",
        period:"Période de voyage",
        region:"Région",
        duration:"Durée du voyage"
      },
      navigation:{
        aria:"Navigation des jours",
        eyebrow:"Jours",
        title:"Vos jours de voyage",
        allDays:"Tous les jours",
        travelDay:"Jour de voyage",
        arrival:"Arrivée",
        departure:"Départ"
      },
      days:{
        label:"Jour {n}",
        labelWithDate:"Jour {n}, {date}",
        titleWithDate:"Jour {n} · {date}",
        today:"Aujourd'hui",
        todaySuffix:", aujourd'hui",
        tomorrow:"Demain",
        yesterday:"Hier",
        progress:"{done} sur {total} points du programme terminés",
        oneDay:"1 jour",
        daysNights:"{days} jours · {nights} {nightsLabel}",
        night:"nuit",
        nights:"nuits"
      },
      day:{
        label:"Jour {n}",
        labelWithDate:"Jour {n}, {date}",
        todaySuffix:", aujourd'hui"
      },
      labels:{
        time:"Heure",
        begin:"Début",
        end:"Fin",
        date:"Date",
        category:"Catégorie",
        location:"Lieu",
        duration:"Durée",
        meetingPoint:"Point de rendez-vous",
        notes:"Notes",
        note:"Note",
        description:"Description",
        contact:"Contact",
        contactPerson:"Personne de contact",
        phone:"Téléphone",
        status:"Statut",
        provider:"Prestataire",
        address:"Adresse",
        outfit:"Vêtements / équipement",
        documents:"Documents",
        difficulty:"Difficulté",
        distance:"Distance",
        walkDuration:"Temps de marche",
        elevation:"Dénivelé positif",
        descent:"Descente",
        weather:"Météo",
        bookingNumber:"Numéro de réservation",
        programItem:"Point du programme",
        accommodation:"Hébergement",
        checkIn:"Check-in",
        checkOut:"Check-out",
        booking:"Réservation"
      },
      actions:{
        details:"Détails",
        showMore:"Afficher plus",
        showLess:"Afficher moins",
        readDescription:"Lire la description",
        openRoute:"Ouvrir l'itinéraire",
        navigation:"Navigation",
        openMap:"Ouvrir la carte",
        openNavigation:"Lancer la navigation",
        googleMaps:"Google Maps",
        appleMaps:"Plans Apple",
        documents:"Documents",
        photos:"Photos",
        hikeDetails:"Détails de la randonnée",
        backToCalendar:"Retour au calendrier",
        backToTimeline:"Retour à la timeline complète",
        previousItem:"Point précédent",
        nextItem:"Point suivant",
        openDocument:"Ouvrir le document",
        openDocumentNamed:"Ouvrir le document : {title}",
        saveTripCalendar:"Enregistrer le voyage entier dans le calendrier",
        done:"Terminé"
      },
      status:{
        optional:"Optionnel",
        reserved:"Réservé",
        confirmed:"Confirmé",
        planned:"Planifié",
        completed:"Terminé",
        continuation:"(suite)"
      },
      route:{
        title:"Itinéraire",
        hike:"Parcours de randonnée",
        overview:"Aperçu de la randonnée",
        summary:"Infos rapides",
        loading:"Chargement de la carte …",
        unavailable:"Itinéraire indisponible",
        mapAria:"Carte de randonnée compacte",
        interactiveMapAria:"Carte d'itinéraire interactive",
        elevation:"Profil d'altitude",
        elevationAria:"Profil d'altitude interactif",
        toolbarAria:"Barre d'outils carte",
        showLocation:"Afficher ma position",
        openGoogleMaps:"Ouvrir dans Google Maps",
        mapNotReady:"La carte n'est pas encore chargée.",
        locationUnsupported:"La localisation n'est pas prise en charge sur cet appareil.",
        locationDetecting:"Localisation en cours …",
        yourLocation:"Votre position",
        locationFailed:"Impossible de déterminer la position. Veuillez vérifier les autorisations.",
        locationActive:"Position active (locale uniquement, non enregistrée)",
        toDestination:"{km} km jusqu'à la destination",
        toHut:"{km} km jusqu'au refuge le plus proche",
        toParking:"{km} km jusqu'au parking",
        elevationDistance:"Altitude {elevation} · Distance {distance}",
        start:"Départ",
        end:"Arrivée"
      },
      calendar:{
        eyebrow:"Calendrier",
        title:"Votre voyage sous forme de calendrier",
        toolbarAria:"Commandes du calendrier",
        viewAria:"Vue calendrier",
        tripView:"Voyage complet",
        dayView:"Vue journalière",
        allDay:"Toute la journée",
        exportMissing:"Aucun événement de calendrier exportable disponible.",
        exportFailed:"Le fichier calendrier n'a pas pu être créé."
      },
      timeline:{
        eyebrow:"Timeline complète",
        title:"Tous les points du programme dans l'ordre",
        dayAria:"Timeline du jour"
      },
      details:{
        eyebrow:"Détails",
        title:"Votre point du programme"
      },
      bookings:{
        eyebrow:"Clôture",
        title:"Prestations confirmées",
        empty:"Aucune réservation n'est actuellement visible pour vous."
      },
      empty:{
        calendar:"Aucun point du programme n'a encore été ajouté au calendrier.",
        program:"Aucun point du programme n'a encore été ajouté pour ce voyage.",
        none:"Aucun itinéraire disponible",
        preparing:"Votre voyage est en cours de préparation.",
        noActivities:"Aucune activité disponible."
      },
      loading:{
        default:"Chargement …",
        refresh:"Actualiser",
        retry:"Réessayer",
        failed:"Échec du chargement"
      },
      aria:{
        view:"Itinéraire",
        overview:"Aperçu du voyage",
        dayNav:"Navigation des jours",
        daySelector:"Sélection du jour",
        documents:"Documents",
        accommodation:"Hébergement",
        weather:"Météo"
      }
    },
    documents:{
      hero:{
        eyebrow:"Alpine Concierge Tirol",
        title:"Vos documents de voyage",
        subtitle:"Tous les documents importants au même endroit.",
        intro:"Tous les documents importants au même endroit."
      },
      overview:{
        eyebrow:"Aperçu",
        title:"Vos catégories",
        copy:"Billets, bons et documents personnels – clairement organisés par thème.",
        documents:"Documents",
        travelDocuments:"Documents de voyage",
        tickets:"Billets",
        bookings:"Réservations",
        invoices:"Factures",
        vouchers:"Bons",
        contracts:"Contrats",
        insurance:"Assurance",
        travelInfo:"Informations de voyage",
        downloads:"Téléchargements"
      },
      list:{
        eyebrow:"Documents",
        title:"Vos documents"
      },
      notes:{
        eyebrow:"Concierge",
        title:"Des questions sur vos documents ?",
        copy:"S'il manque un billet ou un bon, contactez simplement votre concierge – nous sommes heureux de vous aider."
      },
      categories:{
        accommodation:"Hébergement",
        flight:"Vol",
        train:"Train",
        rentalCar:"Location de voiture",
        activities:"Activités",
        restaurant:"Restaurant",
        wellness:"Bien-être",
        transfers:"Transferts",
        other:"Divers",
        tickets:"Billets",
        vouchers:"Bons",
        bookings:"Réservations",
        invoices:"Factures",
        contracts:"Contrats",
        insurance:"Assurance",
        travelInfo:"Informations de voyage",
        travel:"Voyage",
        downloads:"Téléchargements",
        general:"Général"
      },
      types:{
        pdf:"PDF",
        image:"Image",
        qr:"QR",
        word:"Word",
        excel:"Excel",
        ticket:"Billet",
        file:"Fichier",
        document:"Document"
      },
      fields:{
        fileName:"Nom du fichier",
        category:"Catégorie",
        fileSize:"Taille du fichier",
        date:"Date",
        note:"Remarque",
        expiryDate:"Date d'expiration"
      },
      actions:{
        open:"Ouvrir",
        openNamed:"Ouvrir le document : {title}",
        download:"Télécharger",
        downloadNamed:"Télécharger : {title}",
        preview:"Aperçu",
        share:"Partager",
        print:"Imprimer",
        new:"Nouveau",
        updated:"Mis à jour"
      },
      status:{
        available:"disponible",
        preparing:"en préparation",
        missing:"non disponible",
        archived:"archivé"
      },
      empty:{
        title:"Aucun document disponible",
        copy:"Les documents apparaîtront ici dès qu'ils seront disponibles.",
        none:"Aucun document disponible",
        preparing:"Les documents sont en cours de préparation",
        noDownloads:"Aucun téléchargement pour le moment",
        concierge:"Concierge"
      },
      loading:{
        default:"Chargement …",
        refresh:"Actualiser",
        retry:"Réessayer"
      },
      errors:{
        openFailed:"Le document n'a pas pu être ouvert",
        downloadFailed:"Échec du téléchargement",
        unavailable:"Document non disponible"
      },
      preview:{
        caption:"Aperçu du document"
      },
      count:{
        one:"{count} document",
        other:"{count} documents"
      },
      aria:{
        view:"Documents",
        hero:"Documents de voyage",
        center:"Centre de documents",
        overview:"Aperçu des documents",
        categoryNav:"Catégories de documents",
        categoryChip:"{label} : {count}",
        notes:"Notes sur les documents",
        open:"Ouvrir",
        download:"Télécharger",
        preview:"Aperçu"
      }
    },
    service:{
      hero:{
        eyebrow:"Service",
        title:"Votre concierge personnel",
        subtitle:"Nous sommes à vos côtés pour vos souhaits, questions et moments particuliers.",
        intro:"Nous sommes à vos côtés pour vos souhaits, questions et moments particuliers."
      },
      overview:{
        eyebrow:"Assistance",
        title:"Ce que nous pouvons faire pour vous",
        copy:"Une aide directe pour le programme, les modifications et les besoins pratiques – un seul pas suffit.",
        personalSupport:"Assistance personnelle",
        weAreHere:"Nous sommes là pour vous",
        individualCare:"Accompagnement individuel",
        yourRequest:"Votre demande",
        requestService:"Demander un service",
        getSupport:"Obtenir de l'aide",
        personalRecommendation:"Recommandation personnelle",
        discreetReliable:"Discret et fiable",
        duringStay:"Pendant votre séjour"
      },
      concierge:{
        eyebrow:"Concierge",
        title:"Votre interlocuteur",
        personalCare:"Accompagnement personnel",
        lead:"Nous accompagnons votre voyage personnellement – de la première question au moment particulier sur place.",
        personalConcierge:"Votre concierge personnel"
      },
      accommodation:{
        eyebrow:"Hébergement",
        title:"Séjour",
        fallbackName:"Hébergement",
        checkIn:"Check-in",
        checkOut:"Check-out",
        contact:"Contact",
        voucher:"Bon",
        notes:"Notes",
        openNavigation:"Ouvrir la navigation"
      },
      history:{
        eyebrow:"Notes",
        title:"Historique des modifications",
        copy:"Mises à jour importantes concernant votre voyage – chronologiques et claires.",
        publishedVersion:"Version {version} publiée"
      },
      categories:{
        travelPlanning:"Planification du voyage",
        restaurantReservation:"Réservation de restaurant",
        transfers:"Transferts",
        activities:"Activités",
        tickets:"Billets",
        wellness:"Bien-être",
        shopping:"Shopping",
        childcare:"Garde d'enfants",
        petService:"Service pour animaux",
        specialRequests:"Demandes spéciales",
        emergencySupport:"Assistance d'urgence",
        other:"Divers"
      },
      actions:{
        sendRequest:"Envoyer la demande",
        openWhatsApp:"Ouvrir WhatsApp",
        call:"Appeler",
        email:"Écrire un e-mail",
        selectService:"Choisir un service",
        showDetails:"Voir les détails",
        learnMore:"En savoir plus",
        back:"Retour",
        close:"Fermer",
        retry:"Réessayer",
        sendChange:"Envoyer une demande de modification",
        confirmProgram:"Confirmer le programme",
        openPayment:"Ouvrir le paiement",
        downloadPdf:"Télécharger le PDF",
        print:"Imprimer",
        saveCalendar:"Enregistrer le calendrier"
      },
      request:{
        title:"De quoi pouvons-nous nous occuper ?",
        message:"Votre message",
        preferredTime:"Horaire souhaité",
        priority:"Priorité",
        contactMethod:"Moyen de contact",
        send:"Envoyer le message",
        preparing:"Demande en cours de préparation",
        submitted:"Demande envoyée",
        failed:"La demande n'a pas pu être envoyée"
      },
      form:{
        title:"De quoi pouvons-nous nous occuper ?",
        message:"Votre message",
        preferredTime:"Horaire souhaité",
        priority:"Priorité",
        contactMethod:"Moyen de contact",
        send:"Envoyer le message"
      },
      status:{
        preparing:"Demande en cours de préparation",
        submitted:"Demande envoyée",
        failed:"La demande n'a pas pu être envoyée",
        processing:"Demande en cours de traitement"
      },
      contact:{
        phone:"Téléphone",
        email:"E-mail",
        whatsapp:"WhatsApp",
        reachability:"Disponibilité",
        personalContact:"Contact personnel",
        responseTime:"Délai de réponse",
        urgentCases:"En cas d'urgence",
        emergency:"Contact d'urgence",
        localEmergency:"Numéros d'urgence locaux"
      },
      empty:{
        hotel:"Les informations sur votre hébergement sont en cours de préparation et apparaîtront ici une fois disponibles.",
        care:"Votre accompagnement personnel est en cours de préparation.",
        historyTitle:"Aucune modification notée",
        historyCopy:"Les mises à jour concernant votre voyage apparaîtront ici.",
        noServices:"Aucun service disponible pour le moment",
        preparing:"Vos offres de service sont en cours de préparation",
        noRecommendation:"Aucune recommandation disponible actuellement",
        contactConcierge:"Veuillez contacter votre concierge"
      },
      loading:{
        default:"Chargement …",
        processing:"Demande en cours de traitement",
        refresh:"Actualiser",
        retry:"Réessayer"
      },
      errors:{
        loadFailed:"Les données n'ont pas pu être chargées",
        actionFailed:"Action échouée",
        retry:"Veuillez réessayer",
        unavailable:"Service actuellement indisponible",
        submitFailed:"La demande n'a pas pu être envoyée"
      },
      aria:{
        view:"Service",
        hero:"Service",
        contact:"Contact concierge",
        accommodation:"Hébergement",
        actions:"Actions de service",
        history:"Historique des modifications",
        openWhatsApp:"Ouvrir WhatsApp",
        call:"Appeler",
        email:"Écrire un e-mail"
      }
    },
    discover:{
      hero:{
        eyebrow:"Concierge",
        title:"Découvrir",
        subtitle:"Des recommandations particulières pour votre séjour.",
        intro:"Des recommandations particulières pour votre séjour."
      },
      overview:{
        eyebrow:"Sélection",
        title:"Recommandations",
        personal:"Personnel",
        themes:"Thèmes",
        categoriesTitle:"Vos catégories",
        region:"Région",
        surroundings:"Vos environs",
        selectedForYou:"Sélectionné personnellement pour vous",
        ourRecommendations:"Nos recommandations",
        specialExperiences:"Expériences particulières",
        discoverTirol:"Découvrez le Tyrol",
        curatedForYou:"Sélectionné pour vous",
        nearby:"À proximité",
        recommendedToday:"Recommandé aujourd'hui",
        matchingTrip:"Adapté à votre voyage"
      },
      concierge:{
        eyebrow:"Concierge",
        insiderTip:"Conseil d'initié",
        recommendation:"Recommandation de votre concierge",
        curated:"Sélectionné pour vous"
      },
      recommendations:{
        featuredTitle:"Nous recommandons aujourd'hui",
        featuredEyebrow:"Nous recommandons aujourd'hui…",
        regionCopy:"Des idées sélectionnées personnellement autour de votre séjour – calmes, régionales et adaptées à votre voyage.",
        regionFallback:"Votre région",
        surroundingsEyebrow:"Environs"
      },
      categories:{
        culinary:"Gastronomie",
        restaurants:"Restaurants",
        restaurant:"Restaurant",
        nature:"Nature",
        hiking:"Randonnée",
        hike:"Randonnée",
        mountains:"Montagnes",
        culture:"Culture",
        sights:"Sites à voir",
        wellness:"Bien-être",
        family:"Famille",
        children:"Enfants",
        shopping:"Shopping",
        sport:"Sport",
        winter:"Hiver",
        summer:"Été",
        events:"Événements",
        event:"Événements",
        tips:"Bons plans",
        tip:"Conseil",
        excursions:"Excursions",
        other:"Divers",
        general:"Général",
        viewpoint:"Point de vue",
        evening:"Soirée",
        indoor:"Intérieur",
        warning:"Note",
        transport:"Transfert",
        activity:"Activité",
        recommendation:"Recommandation"
      },
      cards:{
        learnMore:"En savoir plus",
        showDetails:"Voir les détails",
        openRoute:"Ouvrir l'itinéraire",
        openMap:"Ouvrir la carte",
        openWebsite:"Ouvrir le site web",
        call:"Appeler",
        email:"Écrire un e-mail",
        requestReservation:"Demander une réservation",
        addToItinerary:"Ajouter à l'itinéraire",
        favorite:"Favori",
        recommended:"Recommandé",
        new:"Nouveau"
      },
      actions:{
        learnMore:"En savoir plus",
        navigation:"Navigation",
        openRegionMaps:"Ouvrir la région dans Maps",
        startNavigation:"Lancer la navigation",
        showDetails:"Voir les détails",
        openRoute:"Ouvrir l'itinéraire",
        openMap:"Ouvrir la carte",
        openWebsite:"Ouvrir le site web",
        call:"Appeler",
        email:"Écrire un e-mail",
        requestReservation:"Demander une réservation",
        addToItinerary:"Ajouter à l'itinéraire"
      },
      labels:{
        distance:"Distance",
        openingHours:"Horaires d'ouverture",
        duration:"Durée",
        price:"Prix",
        suitableFor:"Adapté à",
        note:"Note",
        recommendation:"Recommandation"
      },
      status:{
        favorite:"Favori",
        recommended:"Recommandé",
        new:"Nouveau"
      },
      filters:{
        all:"Tous",
        categories:"Catégories",
        nearby:"À proximité",
        forToday:"Pour aujourd'hui",
        forFamilies:"Pour les familles",
        badWeather:"Par mauvais temps",
        free:"Gratuit",
        open:"Ouvert",
        reset:"Réinitialiser",
        results:"Résultats",
        noMatches:"Aucun résultat"
      },
      navigation:{
        all:"Tous",
        categories:"Catégories",
        results:"Résultats"
      },
      map:{
        title:"Carte",
        location:"Emplacement",
        loading:"Chargement de la carte",
        locationUnavailable:"Emplacement indisponible"
      },
      route:{
        title:"Itinéraire",
        startNavigation:"Lancer la navigation",
        unavailable:"Itinéraire indisponible"
      },
      empty:{
        title:"Aucune recommandation pour le moment",
        copy:"Les conseils personnels apparaîtront ici dès qu'ils seront disponibles.",
        none:"Aucune recommandation disponible pour le moment",
        preparing:"Vos recommandations sont en cours de préparation",
        noMatch:"Aucune expérience adaptée trouvée pour le moment",
        conciergePreparing:"Votre concierge prépare des suggestions personnelles pour vous",
        noResults:"Aucun résultat pour cette sélection"
      },
      loading:{
        default:"Chargement …",
        preparing:"Recommandations en cours de préparation",
        refresh:"Actualiser",
        retry:"Réessayer"
      },
      errors:{
        loadFailed:"Les données n'ont pas pu être chargées",
        unavailable:"Recommandation indisponible",
        actionFailed:"Action échouée",
        retry:"Veuillez réessayer"
      },
      aria:{
        view:"Découvrir",
        hero:"Découvrir",
        featured:"Recommandation personnelle",
        categories:"Catégories",
        list:"Recommandations",
        region:"Vos environs",
        categoryChip:"{label} : {count}",
        learnMore:"En savoir plus",
        navigation:"Navigation"
      }
    },
    errors:{
      notFound:{
        title:"Portail introuvable",
        copy:"Veuillez vérifier votre lien personnel ou contacter directement Alpine Concierge Tirol."
      },
      shareUnavailable:{
        title:"Portail indisponible",
        copy:"Ce lien de portail n'est pas valide ou n'est plus disponible."
      },
      temporarilyUnavailable:"L'accès au portail est temporairement indisponible.",
      documentUnavailable:"Document non disponible"
    },
    aria:{
      header:"En-tête du portail client",
      language:"Langue",
      weather:"Météo",
      documents:"Documents",
      interactiveRouteMap:"Carte d'itinéraire interactive",
      compactHikeMap:"Carte de randonnée compacte",
      elevationProfile:"Profil d'altitude interactif",
      mapToolbar:"Barre d'outils carte",
      daySelector:"Sélection du jour",
      calendarControls:"Commandes du calendrier",
      calendarView:"Vue calendrier"
    },
    date:{
      today:"aujourd'hui"
    }
  };
})();
