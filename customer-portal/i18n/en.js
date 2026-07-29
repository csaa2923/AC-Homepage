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
      whatsappOpen:"Open WhatsApp",
      contactWhatsApp:"Contact Alpine Concierge Tirol",
      showAllFields:"Show all fields",
      version:"Version {version}",
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
        weather:"Loading weather …"
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
        openGoogleMaps:"Open in Google Maps"
      },
      calendar:{
        eyebrow:"Calendar",
        title:"Your trip as a calendar",
        toolbarAria:"Calendar controls",
        viewAria:"Calendar view",
        tripView:"Full trip",
        dayView:"Day view",
        allDay:"All day"
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
      hero:{title:"Your personal concierge"},
      empty:{
        hotel:"Your accommodation details are being prepared and will appear here once released.",
        care:"Your personal care details are being prepared.",
        historyTitle:"No changes noted yet",
        historyCopy:"Updates about your trip will appear here."
      }
    },
    discover:{
      hero:{title:"Discover"},
      empty:{
        title:"No recommendations yet",
        copy:"Personal tips will appear here once they are released."
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
