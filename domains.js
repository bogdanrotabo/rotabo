/* The fields a company can say it works in, and which of Rotabo's
   twelve categories each one lands in.
 *
 * The business side does not show the twelve cards. A firm arrives knowing it
 * does refrigerated haulage, or sworn translation, or cardiology, or ERP
 * rollouts -- not knowing that Rotabo files those under Move, Translator and
 * twice under Something Else. So it searches its own field and the category
 * comes along behind it.
 *
 * The list is deliberately wider than the twelve. Medicine, software, audit,
 * winemaking, metalwork and the shops are not services Rotabo has a card for,
 * and most of them land in "other" for exactly that reason. That is honest
 * about where the site is today rather than pretending the twelve cover the
 * economy, and it means a doctor or a developer can still find themselves,
 * register, and be found.
 *
 * Only the slug and the category live here. The words a visitor reads come
 * from the locale files under domains.*, so this file is the same in every
 * language and the wording is translated in one place with everything else.
 * A slug with no translation yet falls back to English per key, the way
 * rotaboT already does -- an untranslated field reads in English rather than
 * vanishing from the list.
 */
(function (global) {
  "use strict";

  var DOMAINS = [
    // ---------------------------------------------------------- drive (4)
    ["taxi", "drive"],
    ["ride_hailing", "drive"],
    ["chauffeur", "drive"],
    ["driving_school", "drive"],

    // ----------------------------------------------------- translator (4)
    ["translation", "translator"],
    ["interpreting", "translator"],
    ["sworn_translation", "translator"],
    ["language_school", "translator"],

    // ----------------------------------------------------------- move (8)
    ["removals", "move"],
    ["international_removals", "move"],
    ["courier", "move"],
    ["freight_forwarding", "move"],
    ["refrigerated_transport", "move"],
    ["haulage", "move"],
    ["storage_warehousing", "move"],
    ["customs_brokerage", "move"],

    // ---------------------------------------------------------- build (6)
    ["excavation", "build"],
    ["crane_hire", "build"],
    ["scaffolding", "build"],
    ["demolition", "build"],
    ["concrete_works", "build"],
    ["surveying", "build"],

    // ---------------------------------------------------------- tools (3)
    ["tool_hire", "tools"],
    ["machinery_rental", "tools"],
    ["generator_hire", "tools"],

    // ---------------------------------------------------------- home (12)
    ["electrical_installation", "home"],
    ["plumbing", "home"],
    ["heating_hvac", "home"],
    ["air_conditioning", "home"],
    ["painting_decorating", "home"],
    ["carpentry", "home"],
    ["flooring", "home"],
    ["roofing", "home"],
    ["locksmith", "home"],
    ["cleaning_services", "home"],
    ["gardening_landscaping", "home"],
    ["renovation", "home"],

    // ----------------------------------------------------------- auto (5)
    ["car_repair", "auto"],
    ["mobile_mechanic", "auto"],
    ["tyre_service", "auto"],
    ["bodywork_paint", "auto"],
    ["towing_recovery", "auto"],

    // ----------------------------------------------------------- care (3)
    ["childcare", "care"],
    ["elderly_care", "care"],
    ["home_nursing", "care"],

    // ---------------------------------------------------------- learn (5)
    ["private_tutoring", "learn"],
    ["music_lessons", "learn"],
    ["sports_coaching", "learn"],
    ["it_training", "learn"],
    ["vocational_training", "learn"],

    // ----------------------------------------------------------- stay (3)
    ["holiday_lettings", "stay"],
    ["guesthouse_bnb", "stay"],
    ["property_management", "stay"],

    // ----------------------------------------------------------- pets (3)
    ["veterinary", "pets"],
    ["dog_walking", "pets"],
    ["pet_grooming", "pets"],

    // ------------------------------------------- health and medicine (7)
    ["general_practice", "other"],
    ["dentistry", "other"],
    ["physiotherapy", "other"],
    ["psychology", "other"],
    ["pharmacy", "other"],
    ["optometry", "other"],
    ["medical_laboratory", "other"],

    // ------------------------------------------------ software and IT (6)
    ["software_development", "other"],
    ["web_development", "other"],
    ["it_support", "other"],
    ["cybersecurity", "other"],
    ["data_ai", "other"],
    ["cloud_hosting", "other"],

    // ------------------------------------------ professional services (8)
    ["accounting", "other"],
    ["audit_tax", "other"],
    ["legal_services", "other"],
    ["hr_recruitment", "other"],
    ["management_consulting", "other"],
    ["insurance_brokerage", "other"],
    ["real_estate_agency", "other"],
    ["architecture", "other"],

    // --------------------------------------- industry and manufacture (3)
    ["manufacturing", "other"],
    ["cnc_machining", "other"],
    ["metalwork_welding", "other"],

    // ---------------------------------------------- food and hospitality (4)
    ["restaurant", "other"],
    ["catering", "other"],
    ["hotel", "other"],
    ["event_management", "other"],

    // ------------------------------------- agriculture and environment (4)
    ["agriculture", "other"],
    ["forestry", "other"],
    ["waste_recycling", "other"],
    ["renewable_energy", "other"],

    // ----------------------------------------------- creative and media (5)
    ["marketing_agency", "other"],
    ["graphic_design", "other"],
    ["photography", "other"],
    ["video_production", "other"],
    ["printing_signage", "other"],

    // -------------------------------------------- trade and services (3)
    ["wholesale", "other"],
    ["ecommerce", "other"],
    ["security_services", "other"],

    // ----------------------------------------------------- shops (13)
    //
    // A bicycle is not a gym machine and a fridge is not a plumber. Objects
    // people type belong to whoever sells them, so the shops are here and
    // the nouns point at them.
    ["shop_general", "other"],
    ["shop_bicycle", "other"],
    ["shop_auto_parts", "auto"],
    ["shop_hardware", "tools"],
    ["shop_furniture", "home"],
    ["shop_electronics", "other"],
    ["shop_clothing", "other"],
    ["shop_grocery", "other"],
    ["shop_sports", "other"],
    ["shop_books", "other"],
    ["shop_florist", "other"],
    ["shop_pet", "pets"],
    ["motorcycle_repair", "auto"],

    // ---------------------------------------------- beauty and wellness (4)
    ["hairdressing", "other"],
    ["beauty_salon", "other"],
    ["massage_therapy", "other"],
    ["fitness_training", "other"],

    /* ------------------------------------------ the second fifty (50)
       Asked for by name: dentistry neighbours, pedicure, bicycle and
       scooter repair, kebab and shawarma, bars, restaurants' neighbours,
       clubs, discos, beaches. Four of the names asked for were already
       here -- dentistry, beauty_salon, restaurant, tyre_service -- so
       what stands here is what was missing around them.

       Most land in "other" for the same reason the first hundred did:
       Rotabo has twelve consumer cards and a bakery is not one of them.
       That is honest. The card a domain maps to decides where the
       listing is filed, not whether the trade belongs on the site. */
    ["bar",                    "other"],
    ["kebab_shawarma",         "other"],
    ["pizzeria",               "other"],
    ["fast_food",              "other"],
    ["bakery",                 "other"],
    ["pastry_shop",            "other"],
    ["coffee_shop",            "other"],
    ["food_truck",             "other"],
    ["butcher",                "other"],
    ["ice_cream",              "other"],
    ["winery",                 "other"],
    ["brewery",                "other"],
    ["nightclub",              "other"],
    ["beach_club",             "stay"],
    ["bowling_billiards",      "other"],
    ["travel_agency",          "stay"],
    ["nail_salon",             "other"],
    ["barber",                 "other"],
    ["tattoo_piercing",        "other"],
    ["spa_sauna",              "other"],
    ["cosmetics_shop",         "other"],
    ["dry_cleaning",           "other"],
    ["podiatry",               "other"],
    ["dental_laboratory",      "other"],
    ["orthodontics",           "other"],
    ["dermatology",            "other"],
    ["paediatrics",            "other"],
    ["gynaecology",            "other"],
    ["cardiology",             "other"],
    ["medical_imaging",        "other"],
    ["speech_therapy",         "care"],
    ["nutrition_dietetics",    "other"],
    ["bicycle_repair",         "other"],
    ["scooter_repair",         "auto"],
    ["appliance_repair",       "home"],
    ["phone_repair",           "other"],
    ["computer_repair",        "other"],
    ["watch_jewellery_repair", "other"],
    ["shoe_repair",            "other"],
    ["tailoring_alterations",  "other"],
    ["upholstery",             "home"],
    ["glazing",                "build"],
    ["chimney_sweep",          "home"],
    ["pest_control",           "home"],
    ["pool_maintenance",       "home"],
    ["window_cleaning",        "home"],
    ["car_wash",               "auto"],
    ["car_rental",             "drive"],
    ["bike_scooter_rental",    "drive"],
    ["funeral_services",       "other"],

    /* ------------------------------------------- the third fifty (50)
       Notary first, because it was asked for by name and because it is
       the kind of firm a company looks for on the day it needs one and
       not before. Around it: the professions that sit beside a notary --
       bailiff, patents, debt collection, company formation -- then the
       trades that were missing from the building side (insulation,
       waterproofing, plastering, tiling, drywall, fencing, paving, wells,
       septic systems, lifts, fire safety), the vehicle trades, and the
       digital ones a firm actually buys: SEO, social media, apps, drones,
       3D printing. */
    ["notary",               "other"],
    ["bailiff",              "other"],
    ["patent_trademark",     "other"],
    ["debt_collection",      "other"],
    ["company_formation",    "other"],
    ["financial_advisory",   "other"],
    ["payroll_services",     "other"],
    ["currency_exchange",    "other"],
    ["pawnshop",             "other"],
    ["leasing",              "other"],
    ["hearing_aids",         "other"],
    ["medical_transport",    "care"],
    ["rehabilitation",       "care"],
    ["occupational_therapy", "care"],
    ["midwifery",            "care"],
    ["acupuncture",          "other"],
    ["chiropractic",         "other"],
    ["insulation",           "build"],
    ["waterproofing",        "build"],
    ["plastering",           "build"],
    ["tiling",               "build"],
    ["drywall",              "build"],
    ["fencing",              "build"],
    ["paving",               "build"],
    ["well_drilling",        "build"],
    ["septic_systems",       "build"],
    ["solar_panels",         "home"],
    ["alarm_cctv",           "home"],
    ["smart_home",           "home"],
    ["lift_maintenance",     "build"],
    ["fire_safety",          "build"],
    ["car_dealer",           "auto"],
    ["vehicle_inspection",   "auto"],
    ["auto_electrics",       "auto"],
    ["car_glass",            "auto"],
    ["boat_repair",          "auto"],
    ["bus_charter",          "drive"],
    ["call_centre",          "other"],
    ["virtual_assistant",    "other"],
    ["market_research",      "other"],
    ["copywriting",          "other"],
    ["seo_services",         "other"],
    ["social_media",         "other"],
    ["app_development",      "other"],
    ["game_development",     "other"],
    ["drone_services",       "other"],
    ["printing_3d",          "other"],
    ["interior_design",      "home"],
    ["dance_school",         "learn"],
    ["art_gallery",          "other"]
  ];

  global.RotaboDomains = {
    all: function () {
      return DOMAINS.map(function (d) { return { slug: d[0], cat: d[1] }; });
    },
    count: DOMAINS.length
  };
})(window);
