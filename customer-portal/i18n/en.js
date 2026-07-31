/**
 * Ops Ready 5.0A/B.1 – English UI strings (same key structure as de).
 */
(function(){
  "use strict";
  window.ACTPortalI18nCatalogs=window.ACTPortalI18nCatalogs||{};
  window.ACTPortalI18nCatalogs.en={
    navigation:{
      today:"Today",
      itinerary:"Itinerary",
      itineraryShort:"Trip",
      documents:"Documents",
      service:"Service",
      discover:"Discover",
      mainAria:"Main navigation",
      appAria:"App navigation"
    },
    language:{
      label:"Language",
      de:"German",
      en:"English",
      it:"Italian",
      fr:"French"
    },
    common:{
      open:"Open",
      close:"Close",
      loading:"Loading …",
      print:"Print",
      download:"Download",
      error:"Something went wrong.",
      retry:"Try again",
      notAvailable:"Not available",
      secureNote:"This page is only accessible via your personal link.",
      brand:"Alpine Concierge Tirol",
      guest:"Guest",
      whatsappOpen:"Open WhatsApp",
      contactWhatsApp:"Contact Alpine Concierge Tirol",
      showAllFields:"Show all fields",
      version:"Version {version}",
      messages:{
        whatsappQuestion:"Hello Alpine Concierge Tirol, I have a question about my travel programme.",
        whatsappChange:"Hello Alpine Concierge Tirol, I would like to request a change to my travel programme."
      },
      alerts:{
        confirmThanks:"Thank you. The real confirmation will be connected in a later step.",
        paymentLater:"Payment will be connected in a later step.",
        pdfLater:"PDF generation will be connected in a later step.",
        documentPlaceholder:"{name}: Document placeholder for step 1.",
        calendarMissing:"No exportable calendar events available.",
        calendarFailed:"The calendar file could not be created."
      },
      actions:{
        showDetails:"View details",
        openNavigation:"Open navigation",
        openMaps:"Open map",
        openRoute:"Open route",
        call:"Call",
        email:"Send email",
        openWhatsApp:"Open WhatsApp",
        openDocuments:"Open documents",
        openItinerary:"Open itinerary",
        showMore:"Show more",
        showLess:"Show less",
        close:"Close",
        retry:"Try again"
      },
      loading:{
        default:"Loading …",
        preparing:"Preparing your data …",
        weather:"Loading weather …",
        portalTitle:"Loading data …",
        tripPreparing:"Your personal travel programme is being prepared."
      },
      errors:{
        loadFailed:"The data could not be loaded.",
        connectionFailed:"Connection failed.",
        updateFailed:"Update failed.",
        unavailable:"Unavailable"
      },
      status:{
        published:"Published"
      }
    },
    today:{
      hero:{
        eyebrow:"Alpine Concierge Tirol",
        title:"Welcome",
        welcome:"Welcome {name}",
        subtitle:"Your personal travel companion for today."
      },
      focusAria:"Today at a glance",
      overview:{
        title:"Your day at a glance",
        schedule:"Day programme",
        next:"Next itinerary item",
        further:"Further itinerary items",
        noFurther:"No further itinerary items"
      },
      schedule:{
        eyebrow:"Up next",
        title:"Next itinerary item",
        allDay:"All day",
        start:"Starts",
        end:"Ends",
        duration:"Duration",
        meetingPoint:"Meeting point",
        location:"Location",
        notes:"Notes",
        details:"Details",
        today:"Today",
        tomorrow:"Tomorrow",
        time:"Time"
      },
      labels:{
        tripPeriod:"Travel dates",
        region:"Region",
        companions:"Travelling companions",
        tripStatus:"Trip status",
        countdown:"Countdown",
        concierge:"Concierge",
        customerNumber:"Guest number",
        portal:"Portal",
        publication:"Publication"
      },
      actions:{
        showDetails:"View details",
        openNavigation:"Open navigation",
        missingStart:"No starting point available"
      },
      quick:{
        eyebrow:"Quick access",
        title:"Continue",
        itinerary:"Itinerary",
        documents:"Documents",
        contact:"Contact",
        whatsapp:"WhatsApp"
      },
      concierge:{
        eyebrow:"Concierge",
        title:"Important today",
        personal:"Your personal concierge",
        personalAria:"Personal concierge",
        currentHintsAria:"Current notes",
        timeline:"Concierge timeline",
        timelineAria:"Day timeline",
        liveStatus:"Live trip status",
        liveStatusAria:"Live trip status",
        badWeather:"Bad-weather alternatives",
        badWeatherAria:"Bad-weather alternatives",
        evening:"This evening we recommend…",
        eveningAria:"Evening recommendation",
        profile:"Travel profile: {label}",
        greetingFallback:"Welcome"
      },
      weather:{
        eyebrow:"Weather",
        title:"Current weather",
        cardTitle:"Travel weather",
        forLocation:"Weather for:",
        loadingTitle:"Loading live weather …",
        loadingCopy:"Data comes directly from Open-Meteo for your travel dates.",
        unavailableTitle:"No reliable forecast",
        unavailable:"Weather data unavailable",
        loadFailed:"Weather data could not be loaded.",
        source:"Source: Open-Meteo",
        sourceUnavailable:"Source: Open-Meteo (unavailable)",
        coordinates:"Coordinates: {coords}",
        updated:"Updated: {time}",
        noLocation:"No weather location set",
        notSet:"Not set",
        rain:"Rain: {value}%",
        precipitation:"Precipitation: {value} mm",
        wind:"Wind: {value} km/h",
        tempRange:"{min}°C to {max}°C",
        tooFar:"A weather forecast is available from 16 days before your trip starts ({date}).",
        rangeUnavailable:"There is currently no forecast for your travel dates.",
        partialBoth:"Showing the available forecast window within your trip ({start} to {end}).",
        partialPast:"From today ({start}) to the end of your trip, where a forecast is available.",
        partialFuture:"Forecast until {end}. Further days will follow closer to your travel dates.",
        codes:{
          0:"Clear",
          1:"Mostly sunny",
          2:"Partly cloudy",
          3:"Cloudy",
          45:"Fog",
          48:"Rime fog",
          51:"Light drizzle",
          53:"Drizzle",
          55:"Heavy drizzle",
          61:"Light rain",
          63:"Rain",
          65:"Heavy rain",
          71:"Light snow",
          73:"Snow",
          75:"Heavy snow",
          80:"Rain showers",
          81:"Showers",
          82:"Heavy showers",
          95:"Thunderstorm",
          fallback:"Weather data"
        },
        clothing:{
          rain:"Plan for a rain jacket and waterproof shoes.",
          cold:"Pack warm layers and a windproof jacket.",
          wind:"A windproof jacket is recommended.",
          hot:"Sun protection and light clothing are recommended.",
          layers:"Comfortable layered clothing is ideal."
        }
      },
      status:{
        eyebrow:"Further information",
        title:"Where things stand",
        label:"Trip status: {status}",
        updated:"Last updated: {date}",
        defaultStatus:"Not set yet",
        steps:{
          inquiryReceived:"Enquiry received",
          offerCreated:"Offer created",
          offerSent:"Offer sent",
          offerConfirmed:"Offer confirmed",
          paymentOpen:"Payment pending",
          depositReceived:"Deposit received",
          fullyPaid:"Fully paid",
          programInProgress:"Programme in progress",
          programPublished:"Programme published",
          tripOngoing:"Trip in progress",
          tripCompleted:"Trip completed"
        }
      },
      countdown:{
        pending:"Date to follow",
        daysUntil:"{count} days until your trip begins",
        tomorrow:"Your trip begins tomorrow",
        today:"Your trip begins today",
        past:"Your travel dates are in the past"
      },
      next:{
        empty:"There is currently no next itinerary item."
      },
      empty:{
        noSchedule:"Nothing is planned for today yet.",
        preparing:"Your content is being prepared.",
        noHints:"No notes available.",
        noWeather:"No weather data available.",
        noNext:"No next itinerary item"
      },
      aria:{
        focus:"Today at a glance",
        weather:"Weather",
        nextEvent:"Next itinerary item",
        concierge:"Concierge",
        quickActions:"Quick access",
        status:"Trip status"
      }
    },
    itinerary:{
      hero:{
        eyebrow:"Alpine Concierge Tirol",
        title:"Itinerary",
        subtitle:"Your personal travel companion – day by day."
      },
      overview:{
        aria:"Trip overview",
        period:"Travel dates",
        region:"Region",
        duration:"Trip length"
      },
      navigation:{
        aria:"Day navigation",
        eyebrow:"Days",
        title:"Your travel days",
        allDays:"All days",
        travelDay:"Travel day",
        arrival:"Arrival",
        departure:"Departure"
      },
      days:{
        label:"Day {n}",
        labelWithDate:"Day {n}, {date}",
        titleWithDate:"Day {n} · {date}",
        today:"Today",
        todaySuffix:", today",
        tomorrow:"Tomorrow",
        yesterday:"Yesterday",
        progress:"{done} of {total} itinerary items completed",
        oneDay:"1 day",
        daysNights:"{days} days · {nights} {nightsLabel}",
        night:"night",
        nights:"nights"
      },
      day:{
        label:"Day {n}",
        labelWithDate:"Day {n}, {date}",
        todaySuffix:", today"
      },
      labels:{
        time:"Time",
        begin:"Start",
        end:"End",
        date:"Date",
        category:"Category",
        location:"Location",
        duration:"Duration",
        meetingPoint:"Meeting point",
        notes:"Notes",
        note:"Note",
        description:"Description",
        contact:"Contact",
        contactPerson:"Contact person",
        phone:"Phone",
        status:"Status",
        provider:"Provider",
        address:"Address",
        outfit:"Clothing / gear",
        documents:"Documents",
        difficulty:"Difficulty",
        distance:"Distance",
        walkDuration:"Walking time",
        elevation:"Elevation gain",
        descent:"Descent",
        weather:"Weather",
        bookingNumber:"Booking number",
        programItem:"Itinerary item",
        accommodation:"Accommodation",
        checkIn:"Check-in",
        checkOut:"Check-out",
        booking:"Booking"
      },
      actions:{
        details:"Details",
        showMore:"Show more",
        showLess:"Show less",
        readDescription:"Read description",
        openRoute:"Open route",
        navigation:"Navigation",
        openMap:"Open map",
        openNavigation:"Start navigation",
        googleMaps:"Google Maps",
        appleMaps:"Apple Maps",
        documents:"Documents",
        photos:"Photos",
        hikeDetails:"Hike details",
        backToCalendar:"Back to calendar",
        backToTimeline:"Back to full timeline",
        previousItem:"Previous itinerary item",
        nextItem:"Next itinerary item",
        openDocument:"Open document",
        openDocumentNamed:"Open document: {title}",
        saveTripCalendar:"Save full trip to calendar",
        done:"Done"
      },
      status:{
        optional:"Optional",
        reserved:"Reserved",
        confirmed:"Confirmed",
        planned:"Planned",
        completed:"Completed",
        continuation:"(continued)"
      },
      route:{
        title:"Route",
        hike:"Hiking route",
        overview:"Hike overview",
        summary:"Quick info",
        loading:"Loading map …",
        unavailable:"Route unavailable",
        mapAria:"Compact hike map",
        interactiveMapAria:"Interactive route map",
        elevation:"Elevation profile",
        elevationAria:"Interactive elevation profile",
        toolbarAria:"Map toolbar",
        showLocation:"Show my location",
        openGoogleMaps:"Open in Google Maps",
        mapNotReady:"The map is not loaded yet.",
        locationUnsupported:"Location is not supported on this device.",
        locationDetecting:"Detecting location …",
        yourLocation:"Your location",
        locationFailed:"Location could not be determined. Please check permissions.",
        locationActive:"Location active (local only, not stored)",
        toDestination:"{km} km to destination",
        toHut:"{km} km to nearest hut",
        toParking:"{km} km to parking",
        elevationDistance:"Elevation {elevation} · Distance {distance}",
        start:"Start",
        end:"Finish"
      },
      calendar:{
        eyebrow:"Calendar",
        title:"Your trip as a calendar",
        toolbarAria:"Calendar controls",
        viewAria:"Calendar view",
        tripView:"Full trip",
        dayView:"Day view",
        allDay:"All day",
        exportMissing:"No exportable calendar events available.",
        exportFailed:"The calendar file could not be created."
      },
      timeline:{
        eyebrow:"Full timeline",
        title:"All itinerary items in order",
        dayAria:"Day timeline"
      },
      details:{
        eyebrow:"Details",
        title:"Your itinerary item"
      },
      bookings:{
        eyebrow:"Closing",
        title:"Confirmed services",
        empty:"No bookings are currently visible for you."
      },
      empty:{
        calendar:"No itinerary items have been added to the calendar yet.",
        program:"No itinerary items have been added for this trip yet.",
        none:"No itinerary available",
        preparing:"Your trip is being prepared.",
        noActivities:"No activities available."
      },
      loading:{
        default:"Loading …",
        refresh:"Refresh",
        retry:"Try again",
        failed:"Failed to load"
      },
      aria:{
        view:"Itinerary",
        overview:"Trip overview",
        dayNav:"Day navigation",
        daySelector:"Day selection",
        documents:"Documents",
        accommodation:"Accommodation",
        weather:"Weather"
      }
    },
    documents:{
      hero:{
        eyebrow:"Alpine Concierge Tirol",
        title:"Your travel documents",
        subtitle:"All important documents in one place.",
        intro:"All important documents in one place."
      },
      overview:{
        eyebrow:"Overview",
        title:"Your categories",
        copy:"Tickets, vouchers and personal documents – clearly organised by topic.",
        documents:"Documents",
        travelDocuments:"Travel documents",
        tickets:"Tickets",
        bookings:"Bookings",
        invoices:"Invoices",
        vouchers:"Vouchers",
        contracts:"Contracts",
        insurance:"Insurance",
        travelInfo:"Travel information",
        downloads:"Downloads"
      },
      list:{
        eyebrow:"Documents",
        title:"Your documents"
      },
      notes:{
        eyebrow:"Concierge",
        title:"Questions about your documents?",
        copy:"If a ticket or voucher is missing, simply contact your concierge – we are happy to help."
      },
      categories:{
        accommodation:"Accommodation",
        flight:"Flight",
        train:"Train",
        rentalCar:"Car rental",
        activities:"Activities",
        restaurant:"Restaurant",
        wellness:"Wellness",
        transfers:"Transfers",
        other:"Other",
        tickets:"Tickets",
        vouchers:"Vouchers",
        bookings:"Bookings",
        invoices:"Invoices",
        contracts:"Contracts",
        insurance:"Insurance",
        travelInfo:"Travel information",
        travel:"Travel",
        downloads:"Downloads",
        general:"General"
      },
      types:{
        pdf:"PDF",
        image:"Image",
        qr:"QR",
        word:"Word",
        excel:"Excel",
        ticket:"Ticket",
        file:"File",
        document:"Document"
      },
      fields:{
        fileName:"File name",
        category:"Category",
        fileSize:"File size",
        date:"Date",
        note:"Note",
        expiryDate:"Expiry date"
      },
      actions:{
        open:"Open",
        openNamed:"Open document: {title}",
        download:"Download",
        downloadNamed:"Download: {title}",
        preview:"Preview",
        share:"Share",
        print:"Print",
        new:"New",
        updated:"Updated"
      },
      status:{
        available:"available",
        preparing:"being prepared",
        missing:"not available",
        archived:"archived"
      },
      empty:{
        title:"No documents available",
        copy:"Documents will appear here once they are released.",
        none:"No documents available",
        preparing:"Documents are being prepared",
        noDownloads:"No downloads yet",
        concierge:"Concierge"
      },
      loading:{
        default:"Loading …",
        refresh:"Refresh",
        retry:"Try again"
      },
      errors:{
        openFailed:"Document could not be opened",
        downloadFailed:"Download failed",
        unavailable:"Document not available"
      },
      preview:{
        caption:"Document preview"
      },
      count:{
        one:"{count} document",
        other:"{count} documents"
      },
      aria:{
        view:"Documents",
        hero:"Travel documents",
        center:"Document centre",
        overview:"Documents overview",
        categoryNav:"Document categories",
        categoryChip:"{label}: {count}",
        notes:"Notes about documents",
        open:"Open",
        download:"Download",
        preview:"Preview"
      }
    },
    service:{
      hero:{
        eyebrow:"Service",
        title:"Your personal concierge",
        subtitle:"We are here for your wishes, questions and special moments.",
        intro:"We are here for your wishes, questions and special moments."
      },
      overview:{
        eyebrow:"Support",
        title:"How we can help you",
        copy:"Direct help with your programme, changes and practical needs – one step is enough.",
        personalSupport:"Personal support",
        weAreHere:"We are here for you",
        individualCare:"Individual care",
        yourRequest:"Your request",
        requestService:"Request a service",
        getSupport:"Get support",
        personalRecommendation:"Personal recommendation",
        discreetReliable:"Discreet and reliable",
        duringStay:"During your stay"
      },
      concierge:{
        eyebrow:"Concierge",
        title:"Your contact",
        personalCare:"Personal care",
        lead:"We accompany your trip personally – from the first question to the special moment on site.",
        personalConcierge:"Your personal concierge"
      },
      accommodation:{
        eyebrow:"Accommodation",
        title:"Stay",
        fallbackName:"Accommodation",
        checkIn:"Check-in",
        checkOut:"Check-out",
        contact:"Contact",
        voucher:"Voucher",
        notes:"Notes",
        openNavigation:"Open navigation"
      },
      history:{
        eyebrow:"Notes",
        title:"Change history",
        copy:"Important updates about your trip – chronological and clear.",
        publishedVersion:"Version {version} published"
      },
      categories:{
        travelPlanning:"Travel planning",
        restaurantReservation:"Restaurant reservation",
        transfers:"Transfers",
        activities:"Activities",
        tickets:"Tickets",
        wellness:"Wellness",
        shopping:"Shopping",
        childcare:"Childcare",
        petService:"Pet service",
        specialRequests:"Special requests",
        emergencySupport:"Emergency support",
        other:"Other"
      },
      actions:{
        sendRequest:"Send request",
        openWhatsApp:"Open WhatsApp",
        call:"Call",
        email:"Write email",
        selectService:"Select service",
        showDetails:"View details",
        learnMore:"Learn more",
        back:"Back",
        close:"Close",
        retry:"Try again",
        sendChange:"Send change request",
        confirmProgram:"Confirm programme",
        openPayment:"Open payment",
        downloadPdf:"Download PDF",
        print:"Print",
        saveCalendar:"Save calendar"
      },
      request:{
        title:"How may we help you?",
        message:"Your message",
        preferredTime:"Preferred time",
        priority:"Priority",
        contactMethod:"Contact method",
        send:"Send message",
        preparing:"Request is being prepared",
        submitted:"Request has been submitted",
        failed:"Request could not be submitted"
      },
      form:{
        title:"How may we help you?",
        message:"Your message",
        preferredTime:"Preferred time",
        priority:"Priority",
        contactMethod:"Contact method",
        send:"Send message"
      },
      status:{
        preparing:"Request is being prepared",
        submitted:"Request has been submitted",
        failed:"Request could not be submitted",
        processing:"Request is being processed"
      },
      contact:{
        phone:"Phone",
        email:"Email",
        whatsapp:"WhatsApp",
        reachability:"Availability",
        personalContact:"Personal contact",
        responseTime:"Response time",
        urgentCases:"In urgent cases",
        emergency:"Emergency contact",
        localEmergency:"Local emergency numbers"
      },
      empty:{
        hotel:"Your accommodation details are being prepared and will appear here once released.",
        care:"Your personal care details are being prepared.",
        historyTitle:"No changes noted yet",
        historyCopy:"Updates about your trip will appear here.",
        noServices:"No services available yet",
        preparing:"Your service offers are being prepared",
        noRecommendation:"No recommendation currently available",
        contactConcierge:"Please contact your concierge"
      },
      loading:{
        default:"Loading …",
        processing:"Request is being processed",
        refresh:"Refresh",
        retry:"Try again"
      },
      errors:{
        loadFailed:"The data could not be loaded",
        actionFailed:"Action failed",
        retry:"Please try again",
        unavailable:"Service currently unavailable",
        submitFailed:"Request could not be submitted"
      },
      aria:{
        view:"Service",
        hero:"Service",
        contact:"Concierge contact",
        accommodation:"Accommodation",
        actions:"Service actions",
        history:"Change history",
        openWhatsApp:"Open WhatsApp",
        call:"Call",
        email:"Write email"
      }
    },
    discover:{
      hero:{
        eyebrow:"Concierge",
        title:"Discover",
        subtitle:"Special recommendations for your stay.",
        intro:"Special recommendations for your stay."
      },
      overview:{
        eyebrow:"Selection",
        title:"Recommendations",
        personal:"Personal",
        themes:"Themes",
        categoriesTitle:"Your categories",
        region:"Region",
        surroundings:"Your surroundings",
        selectedForYou:"Personally selected for you",
        ourRecommendations:"Our recommendations",
        specialExperiences:"Special experiences",
        discoverTirol:"Discover Tyrol",
        curatedForYou:"Curated for you",
        nearby:"Nearby",
        recommendedToday:"Recommended today",
        matchingTrip:"Matched to your trip"
      },
      concierge:{
        eyebrow:"Concierge",
        insiderTip:"Insider tip",
        recommendation:"Your concierge's recommendation",
        curated:"Curated for you"
      },
      recommendations:{
        featuredTitle:"We recommend today",
        featuredEyebrow:"We recommend today…",
        regionCopy:"Personally selected ideas around your stay – calm, regional and matched to your trip.",
        regionFallback:"Your region",
        surroundingsEyebrow:"Surroundings"
      },
      categories:{
        culinary:"Culinary",
        restaurants:"Restaurants",
        restaurant:"Restaurant",
        nature:"Nature",
        hiking:"Hiking",
        hike:"Hiking",
        mountains:"Mountains",
        culture:"Culture",
        sights:"Sights",
        wellness:"Wellness",
        family:"Family",
        children:"Children",
        shopping:"Shopping",
        sport:"Sport",
        winter:"Winter",
        summer:"Summer",
        events:"Events",
        event:"Events",
        tips:"Hidden gems",
        tip:"Tip",
        excursions:"Excursions",
        other:"Other",
        general:"General",
        viewpoint:"Viewpoint",
        evening:"Evening",
        indoor:"Indoor",
        warning:"Note",
        transport:"Transfer",
        activity:"Activity",
        recommendation:"Recommendation"
      },
      cards:{
        learnMore:"Learn more",
        showDetails:"View details",
        openRoute:"Open route",
        openMap:"Open map",
        openWebsite:"Open website",
        call:"Call",
        email:"Write email",
        requestReservation:"Request a reservation",
        addToItinerary:"Add to itinerary",
        favorite:"Favourite",
        recommended:"Recommended",
        new:"New"
      },
      actions:{
        learnMore:"Learn more",
        navigation:"Navigation",
        openRegionMaps:"Open region in Maps",
        startNavigation:"Start navigation",
        showDetails:"View details",
        openRoute:"Open route",
        openMap:"Open map",
        openWebsite:"Open website",
        call:"Call",
        email:"Write email",
        requestReservation:"Request a reservation",
        addToItinerary:"Add to itinerary"
      },
      labels:{
        distance:"Distance",
        openingHours:"Opening hours",
        duration:"Duration",
        price:"Price",
        suitableFor:"Suitable for",
        note:"Note",
        recommendation:"Recommendation"
      },
      status:{
        favorite:"Favourite",
        recommended:"Recommended",
        new:"New"
      },
      filters:{
        all:"All",
        categories:"Categories",
        nearby:"Nearby",
        forToday:"For today",
        forFamilies:"For families",
        badWeather:"For bad weather",
        free:"Free",
        open:"Open",
        reset:"Reset",
        results:"Results",
        noMatches:"No matches"
      },
      navigation:{
        all:"All",
        categories:"Categories",
        results:"Results"
      },
      map:{
        title:"Map",
        location:"Location",
        loading:"Loading map",
        locationUnavailable:"Location unavailable"
      },
      route:{
        title:"Route",
        startNavigation:"Start navigation",
        unavailable:"Route unavailable"
      },
      empty:{
        title:"No recommendations yet",
        copy:"Personal tips will appear here once they are released.",
        none:"No recommendations available yet",
        preparing:"Your recommendations are being prepared",
        noMatch:"No matching experiences found at the moment",
        conciergePreparing:"Your concierge is putting together personal suggestions for you",
        noResults:"No results for this selection"
      },
      loading:{
        default:"Loading …",
        preparing:"Recommendations are being prepared",
        refresh:"Refresh",
        retry:"Try again"
      },
      errors:{
        loadFailed:"The data could not be loaded",
        unavailable:"Recommendation unavailable",
        actionFailed:"Action failed",
        retry:"Please try again"
      },
      aria:{
        view:"Discover",
        hero:"Discover",
        featured:"Personal recommendation",
        categories:"Categories",
        list:"Recommendations",
        region:"Your surroundings",
        categoryChip:"{label}: {count}",
        learnMore:"Learn more",
        navigation:"Navigation"
      }
    },
    errors:{
      notFound:{
        title:"Portal not found",
        copy:"Please check your personal link or contact Alpine Concierge Tirol directly."
      },
      shareUnavailable:{
        title:"Portal unavailable",
        copy:"This portal link is invalid or no longer available."
      },
      temporarilyUnavailable:"Portal access is temporarily unavailable.",
      documentUnavailable:"Document not available"
    },
    aria:{
      header:"Customer portal header",
      language:"Language",
      weather:"Weather",
      documents:"Documents",
      interactiveRouteMap:"Interactive route map",
      compactHikeMap:"Compact hike map",
      elevationProfile:"Interactive elevation profile",
      mapToolbar:"Map toolbar",
      daySelector:"Day selection",
      calendarControls:"Calendar controls",
      calendarView:"Calendar view"
    },
    date:{
      today:"today"
    }
  };
})();
