// Nigerian States and Cities Data
export interface State {
  name: string;
  code: string;
  cities: string[];
}

export const NIGERIAN_STATES: State[] = [
  {
    name: "Abia",
    code: "AB",
    cities: ["Aba", "Umuahia", "Arochukwu", "Ohafia", "Bende", "Aba North", "Aba South"]
  },
  {
    name: "Adamawa",
    code: "AD",
    cities: ["Yola", "Mubi", "Jimeta", "Numan", "Ganye", "Mayo Belwa", "Michika"]
  },
  {
    name: "Akwa Ibom",
    code: "AK",
    cities: ["Uyo", "Ikot Ekpene", "Eket", "Abak", "Oron", "Ikot Abasi", "Etinan"]
  },
  {
    name: "Anambra",
    code: "AN",
    cities: ["Awka", "Onitsha", "Nnewi", "Aguata", "Idemili", "Orumba", "Anambra East"]
  },
  {
    name: "Bauchi",
    code: "BA",
    cities: ["Bauchi", "Azare", "Jama'are", "Katagum", "Misau", "Ningi", "Tafawa Balewa"]
  },
  {
    name: "Bayelsa",
    code: "BY",
    cities: ["Yenagoa", "Brass", "Nembe", "Ogbia", "Sagbama", "Ekeremor", "Kolokuma/Opokuma"]
  },
  {
    name: "Benue",
    code: "BE",
    cities: ["Makurdi", "Gboko", "Katsina-Ala", "Otukpo", "Adikpo", "Obi", "Konshisha"]
  },
  {
    name: "Borno",
    code: "BO",
    cities: ["Maiduguri", "Bama", "Dikwa", "Gwoza", "Konduga", "Monguno", "Damboa"]
  },
  {
    name: "Cross River",
    code: "CR",
    cities: ["Calabar", "Ogoja", "Ikom", "Obudu", "Ugep", "Akpabuyo", "Bakassi"]
  },
  {
    name: "Delta",
    code: "DE",
    cities: ["Asaba", "Warri", "Sapele", "Ughelli", "Agbor", "Okpanam", "Oghara"]
  },
  {
    name: "Ebonyi",
    code: "EB",
    cities: ["Abakaliki", "Afikpo", "Onueke", "Ezza", "Ishielu", "Ohaukwu", "Ikwo"]
  },
  {
    name: "Edo",
    code: "ED",
    cities: ["Benin City", "Auchi", "Ekpoma", "Uromi", "Igueben", "Orhionmwon", "Ovia"]
  },
  {
    name: "Ekiti",
    code: "EK",
    cities: ["Ado-Ekiti", "Ikere-Ekiti", "Ilawe-Ekiti", "Ise-Ekiti", "Emure-Ekiti", "Ode-Ekiti", "Efon-Alaaye"]
  },
  {
    name: "Enugu",
    code: "EN",
    cities: ["Enugu", "Nsukka", "Agbani", "Oji-River", "Udi", "Ezeagu", "Igbo-Etiti"]
  },
  {
    name: "FCT",
    code: "FC",
    cities: ["Abuja", "Garki", "Wuse", "Maitama", "Asokoro", "Gwarinpa", "Kubwa"]
  },
  {
    name: "Gombe",
    code: "GO",
    cities: ["Gombe", "Bajoga", "Dukku", "Kaltungo", "Billiri", "Kumo", "Nafada"]
  },
  {
    name: "Imo",
    code: "IM",
    cities: ["Owerri", "Orlu", "Okigwe", "Mbaise", "Oguta", "Ahiara", "Nkwerre"]
  },
  {
    name: "Jigawa",
    code: "JI",
    cities: ["Dutse", "Hadejia", "Gumel", "Kazaure", "Ringim", "Babura", "Gwaram"]
  },
  {
    name: "Kaduna",
    code: "KD",
    cities: ["Kaduna", "Zaria", "Kafanchan", "Ikara", "Makarfi", "Soba", "Giwa"]
  },
  {
    name: "Kano",
    code: "KN",
    cities: ["Kano", "Wudil", "Gaya", "Rano", "Bichi", "Dawakin Kudu", "Tarauni"]
  },
  {
    name: "Katsina",
    code: "KT",
    cities: ["Katsina", "Daura", "Funtua", "Malumfashi", "Kankia", "Dutsin-Ma", "Mani"]
  },
  {
    name: "Kebbi",
    code: "KE",
    cities: ["Birnin Kebbi", "Argungu", "Yauri", "Zuru", "Bunza", "Gwandu", "Kalgo"]
  },
  {
    name: "Kogi",
    code: "KO",
    cities: ["Lokoja", "Okene", "Idah", "Kabba", "Ankpa", "Dekina", "Ajaokuta"]
  },
  {
    name: "Kwara",
    code: "KW",
    cities: ["Ilorin", "Offa", "Omu-Aran", "Patigi", "Kaiama", "Baruten", "Edu"]
  },
  {
    name: "Lagos",
    code: "LA",
    cities: ["Lagos", "Ikeja", "Victoria Island", "Lekki", "Surulere", "Yaba", "Ikoyi", "Ajah", "Alimosho", "Kosofe", "Mushin", "Oshodi", "Agege", "Ifako-Ijaiye"]
  },
  {
    name: "Nasarawa",
    code: "NA",
    cities: ["Lafia", "Keffi", "Akwanga", "Nasarawa", "Karu", "Doma", "Obi"]
  },
  {
    name: "Niger",
    code: "NI",
    cities: ["Minna", "Suleja", "Bida", "Kontagora", "Agaie", "Lapai", "Wushishi"]
  },
  {
    name: "Ogun",
    code: "OG",
    cities: ["Abeokuta", "Sagamu", "Ijebu-Ode", "Ilaro", "Ota", "Ifo", "Ado-Odo"]
  },
  {
    name: "Ondo",
    code: "ON",
    cities: ["Akure", "Ondo", "Owo", "Okitipupa", "Ikare", "Igbokoda", "Ode-Aye"]
  },
  {
    name: "Osun",
    code: "OS",
    cities: ["Osogbo", "Ile-Ife", "Ilesa", "Ede", "Iwo", "Ikire", "Ejigbo"]
  },
  {
    name: "Oyo",
    code: "OY",
    cities: ["Ibadan", "Ogbomoso", "Oyo", "Iseyin", "Saki", "Eruwa", "Ibarapa"]
  },
  {
    name: "Plateau",
    code: "PL",
    cities: ["Jos", "Bukuru", "Pankshin", "Shendam", "Langtang", "Wase", "Barkin Ladi"]
  },
  {
    name: "Rivers",
    code: "RI",
    cities: ["Port Harcourt", "Obio-Akpor", "Eleme", "Okrika", "Bonny", "Degema", "Ahoada"]
  },
  {
    name: "Sokoto",
    code: "SO",
    cities: ["Sokoto", "Tambuwal", "Wurno", "Gwadabawa", "Illela", "Binji", "Gudu"]
  },
  {
    name: "Taraba",
    code: "TA",
    cities: ["Jalingo", "Wukari", "Bali", "Gassol", "Ibi", "Lau", "Sardauna"]
  },
  {
    name: "Yobe",
    code: "YO",
    cities: ["Damaturu", "Potiskum", "Gashua", "Nguru", "Geidam", "Bade", "Jakusko"]
  },
  {
    name: "Zamfara",
    code: "ZA",
    cities: ["Gusau", "Kaura Namoda", "Anka", "Bakura", "Maradun", "Shinkafi", "Talata Mafara"]
  }
];

// Helper functions
export const getStates = (): State[] => {
  return NIGERIAN_STATES;
};

export const getStateByName = (name: string): State | undefined => {
  return NIGERIAN_STATES.find(state => state.name.toLowerCase() === name.toLowerCase());
};

export const getCitiesByState = (stateName: string): string[] => {
  const state = getStateByName(stateName);
  return state?.cities || [];
};

export const getAllCities = (): string[] => {
  return NIGERIAN_STATES.flatMap(state => state.cities);
};

export const getStateCodes = (): string[] => {
  return NIGERIAN_STATES.map(state => state.code);
};



