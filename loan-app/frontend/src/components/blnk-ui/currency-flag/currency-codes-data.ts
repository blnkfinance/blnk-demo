/** Currency codes mapped to country codes for CountryFlag — extracted from currency-flag. */
export const CRYPTO_CURRENCIES = new Set([
  "BTC",
  "ETH",
  "USDT",
  "USDC",
  "BNB",
  "XRP",
  "ADA",
  "SOL",
  "DOT",
  "DOGE",
  "AVAX",
  "MATIC",
]);

export const STABLECOINS = new Set([
  "USDT",
  "USDC",
  "BUSD",
  "DAI",
  "TUSD",
  "USDP",
  "FRAX",
]);

export const CURRENCY_TO_COUNTRIES_MAP = {
        EUR: [
          "AT",
          "BE",
          "CY",
          "EE",
          "FI",
          "FR",
          "DE",
          "GR",
          "IE",
          "IT",
          "LV",
          "LT",
          "LU",
          "MT",
          "NL",
          "PT",
          "SK",
          "SI",
          "ES",
          "VA",
          "MC",
          "SM",
          "ME",
        ], // Euro
        XOF: ["BJ", "BF", "GW", "CI", "ML", "NE", "SN", "TG"], // West African CFA franc
        XAF: ["CM", "CF", "TD", "CG", "GQ", "GA"], // Central African CFA franc
        XCD: ["AG", "DM", "GD", "KN", "LC", "VC", "MS", "AI"], // East Caribbean dollar
        USD: [
          "US",
          "AS",
          "BQ",
          "IO",
          "VG",
          "BT",
          "EC",
          "SV",
          "GU",
          "HT",
          "MH",
          "FM",
          "MP",
          "PW",
          "PA",
          "PR",
          "TL",
          "TC",
          "UM",
          "VI",
        ], // US Dollar
        AUD: ["AU", "CX", "CC", "HM", "KI", "NR", "NF", "TV"], // Australian Dollar
        GBP: ["GB", "GS", "IM", "JE", "GG"], // British Pound
        CHF: ["CH", "LI"], // Swiss Franc
        NZD: ["NZ", "CK", "NU", "PN", "TK"], // New Zealand Dollar
        DKK: ["DK", "FO", "GL"], // Danish Krone
        AFN: ["AF"], // Afghan Afghani
        ALL: ["AL"], // Albanian Lek
        DZD: ["DZ"], // Algerian Dinar
        AOA: ["AO"], // Angolan Kwanza
        ARS: ["AR"], // Argentine Peso
        AMD: ["AM"], // Armenian Dram
        AZN: ["AZ"], // Azerbaijani Manat
        BHD: ["BH"], // Bahraini Dinar
        BDT: ["BD"], // Bangladeshi Taka
        BBD: ["BB"], // Barbadian Dollar
        BYN: ["BY"], // Belarusian Ruble
        BZD: ["BZ"], // Belize Dollar
        BOB: ["BO"], // Bolivian Boliviano
        BWP: ["BW"], // Botswana Pula
        BRL: ["BR"], // Brazilian Real
        BND: ["BN"], // Brunei Dollar
        BGN: ["BG"], // Bulgarian Lev
        BIF: ["BI"], // Burundi Franc
        KHR: ["KH"], // Cambodian Riel
        CAD: ["CA"], // Canadian Dollar
        CVE: ["CV"], // Cape Verdean Escudo
        CLP: ["CL"], // Chilean Peso
        CNY: ["CN"], // Chinese Yuan
        COP: ["CO"], // Colombian Peso
        KMF: ["KM"], // Comorian Franc
        CDF: ["CD"], // Congolese Franc
        CRC: ["CR"], // Costa Rican Colón
        HRK: ["HR"], // Croatian Kuna
        CUP: ["CU"], // Cuban Peso
        CZK: ["CZ"], // Czech Koruna
        DJF: ["DJ"], // Djiboutian Franc
        DOP: ["DO"], // Dominican Peso
        EGP: ["EG"], // Egyptian Pound
        ERN: ["ER"], // Eritrean Nakfa
        ETB: ["ET"], // Ethiopian Birr
        FJD: ["FJ"], // Fijian Dollar
        GMD: ["GM"], // Gambian Dalasi
        GEL: ["GE"], // Georgian Lari
        GHS: ["GH"], // Ghanaian Cedi
        GTQ: ["GT"], // Guatemalan Quetzal
        GNF: ["GN"], // Guinean Franc
        GYD: ["GY"], // Guyanese Dollar
        HTG: ["HT"], // Haitian Gourde
        HNL: ["HN"], // Honduran Lempira
        HKD: ["HK"], // Hong Kong Dollar
        HUF: ["HU"], // Hungarian Forint
        ISK: ["IS"], // Icelandic Króna
        INR: ["IN"], // Indian Rupee
        IDR: ["ID"], // Indonesian Rupiah
        IRR: ["IR"], // Iranian Rial
        IQD: ["IQ"], // Iraqi Dinar
        ILS: ["IL", "PS"], // Israeli New Shekel
        JMD: ["JM"], // Jamaican Dollar
        JPY: ["JP"], // Japanese Yen
        JOD: ["JO"], // Jordanian Dinar
        KZT: ["KZ"], // Kazakhstani Tenge
        KES: ["KE"], // Kenyan Shilling
        KWD: ["KW"], // Kuwaiti Dinar
        KGS: ["KG"], // Kyrgyzstani Som
        LAK: ["LA"], // Lao Kip
        LBP: ["LB"], // Lebanese Pound
        LSL: ["LS"], // Lesotho Loti
        LRD: ["LR"], // Liberian Dollar
        LYD: ["LY"], // Libyan Dinar
        MOP: ["MO"], // Macanese Pataca
        MKD: ["MK"], // Macedonian Denar
        MGA: ["MG"], // Malagasy Ariary
        MWK: ["MW"], // Malawian Kwacha
        MYR: ["MY"], // Malaysian Ringgit
        MVR: ["MV"], // Maldivian Rufiyaa
        MRU: ["MR"], // Mauritanian Ouguiya
        MUR: ["MU"], // Mauritian Rupee
        MXN: ["MX"], // Mexican Peso
        MDL: ["MD"], // Moldovan Leu
        MNT: ["MN"], // Mongolian Tögrög
        MAD: ["MA"], // Moroccan Dirham
        MZN: ["MZ"], // Mozambican Metical
        MMK: ["MM"], // Myanmar Kyat
        NAD: ["NA"], // Namibian Dollar
        NPR: ["NP"], // Nepalese Rupee
        NIO: ["NI"], // Nicaraguan Córdoba
        NGN: ["NG"], // Nigerian Naira
        KPW: ["KP"], // North Korean Won
        NOK: ["NO"], // Norwegian Krone
        OMR: ["OM"], // Omani Rial
        PKR: ["PK"], // Pakistani Rupee
        PAB: ["PA"], // Panamanian Balboa
        PGK: ["PG"], // Papua New Guinean Kina
        PYG: ["PY"], // Paraguayan Guaraní
        PEN: ["PE"], // Peruvian Sol
        PHP: ["PH"], // Philippine Peso
        PLN: ["PL"], // Polish Złoty
        QAR: ["QA"], // Qatari Riyal
        RON: ["RO"], // Romanian Leu
        RUB: ["RU"], // Russian Ruble
        RWF: ["RW"], // Rwandan Franc
        SAR: ["SA"], // Saudi Riyal
        RSD: ["RS"], // Serbian Dinar
        SCR: ["SC"], // Seychellois Rupee
        SLE: ["SL"], // Sierra Leonean Leone
        SGD: ["SG"], // Singapore Dollar
        SBD: ["SB"], // Solomon Islands Dollar
        SOS: ["SO"], // Somali Shilling
        ZAR: ["ZA"], // South African Rand
        KRW: ["KR"], // South Korean Won
        SSP: ["SS"], // South Sudanese Pound
        LKR: ["LK"], // Sri Lankan Rupee
        SDG: ["SD"], // Sudanese Pound
        SRD: ["SR"], // Surinamese Dollar
        SZL: ["SZ"], // Swazi Lilangeni
        SEK: ["SE"], // Swedish Krona
        SYP: ["SY"], // Syrian Pound
        TWD: ["TW"], // New Taiwan Dollar
        TJS: ["TJ"], // Tajikistani Somoni
        TZS: ["TZ"], // Tanzanian Shilling
        THB: ["TH"], // Thai Baht
        TOP: ["TO"], // Tongan Paʻanga
        TTD: ["TT"], // Trinidad and Tobago Dollar
        TND: ["TN"], // Tunisian Dinar
        TRY: ["TR"], // Turkish Lira
        TMT: ["TM"], // Turkmenistani Manat
        UGX: ["UG"], // Ugandan Shilling
        UAH: ["UA"], // Ukrainian Hryvnia
        AED: ["AE"], // UAE Dirham
        UYU: ["UY"], // Uruguayan Peso
        UZS: ["UZ"], // Uzbekistani Som
        VUV: ["VU"], // Vanuatu Vatu
        VES: ["VE"], // Venezuelan Bolívar Soberano
        VND: ["VN"], // Vietnamese Đồng
        YER: ["YE"], // Yemeni Rial
        ZMW: ["ZM"], // Zambian Kwacha
        ZWL: ["ZW"], // Zimbabwean Dollar
      } as const;

export function getGeneralCurrencyCodes(): string[] {
  const fromMap = Object.keys(CURRENCY_TO_COUNTRIES_MAP) as string[];
  const crypto = [...CRYPTO_CURRENCIES, ...STABLECOINS];
  return Array.from(new Set([...fromMap, ...crypto])).sort((a, b) =>
    a.localeCompare(b)
  );
}
