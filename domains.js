/* The hundred fields a company can say it works in, and which of Rotabo's
   twelve categories each one lands in.
 *
 * The business side does not show the twelve cards. A firm arrives knowing it
 * does refrigerated haulage, or sworn translation, or cardiology, or ERP
 * rollouts -- not knowing that Rotabo files those under Move, Translator and
 * twice under Something Else. So it searches its own field and the category
 * comes along behind it.
 *
 * The list is deliberately wider than the twelve. Medicine, software, audit,
 * winemaking and metalwork are not services Rotabo has a card for, and forty-four
 * of the hundred land in "other" for exactly that reason. That is honest
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

    // ---------------------------------------------- beauty and wellness (4)
    ["hairdressing", "other"],
    ["beauty_salon", "other"],
    ["massage_therapy", "other"],
    ["fitness_training", "other"]
  ];

  global.RotaboDomains = {
    all: function () {
      return DOMAINS.map(function (d) { return { slug: d[0], cat: d[1] }; });
    },
    count: DOMAINS.length
  };
})(window);
