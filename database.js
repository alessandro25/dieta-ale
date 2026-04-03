/* =============================================
   DIETA ALE v4.1 — DATABASE
   Food DB, Default Diets, Constants
   ============================================= */

// Default Settings (Alessandro's pump: Medtronic 780G)
var DEF_S = {
  isf: 65,        // mg/dL per unit
  icr: 17,        // grams carb per unit
  target: 120,    // target mg/dL
  dia: 135,       // duration of insulin action (minutes)
  gpr: 30,        // grams (fat+protein) per unit for FPU
  splitBolus: true,
  splitStart: 60, // % at meal start
  splitEnd: 40,   // % at meal end
  reminder: true,
  reminderDelay: 150 // minutes delay for bolo2
};

// Default GYM day meals
var DEF_GYM = [
  {name:"Colazione",time:"07:30",foods:[
    {n:"Avena fiocchi",g:50},{n:"Latte parz. scremato",g:200},{n:"Mirtilli",g:50},{n:"Mandorle",g:10}
  ]},
  {name:"Spuntino Mattina",time:"10:00",foods:[
    {n:"Yogurt greco 0%",g:170},{n:"Miele",g:10}
  ]},
  {name:"Pranzo",time:"12:30",foods:[
    {n:"Pasta di semola",g:70},{n:"Petto di pollo",g:150},{n:"Olio extravergine oliva",g:10},{n:"Insalata mista",g:100}
  ]},
  {name:"Spuntino Pre-Workout",time:"15:30",foods:[
    {n:"Banana",g:100},{n:"Gallette di riso",g:30}
  ]},
  {name:"Cena Post-Workout",time:"19:30",foods:[
    {n:"Riso basmati",g:70},{n:"Salmone fresco",g:150},{n:"Zucchine",g:150},{n:"Olio extravergine oliva",g:10}
  ]},
  {name:"Spuntino Sera",time:"22:00",foods:[
    {n:"Fiocchi di latte",g:125},{n:"Noci",g:15}
  ]}
];

// Default REST day meals
var DEF_REST = [
  {name:"Colazione",time:"07:30",foods:[
    {n:"Avena fiocchi",g:40},{n:"Latte parz. scremato",g:200},{n:"Fragole",g:80}
  ]},
  {name:"Spuntino Mattina",time:"10:00",foods:[
    {n:"Yogurt greco 0%",g:150}
  ]},
  {name:"Pranzo",time:"12:30",foods:[
    {n:"Pasta integrale",g:60},{n:"Petto di pollo",g:130},{n:"Olio extravergine oliva",g:8},{n:"Pomodori",g:100}
  ]},
  {name:"Spuntino Pomeriggio",time:"16:00",foods:[
    {n:"Mela",g:150},{n:"Mandorle",g:10}
  ]},
  {name:"Cena",time:"19:30",foods:[
    {n:"Merluzzo",g:150},{n:"Broccoli",g:150},{n:"Patate",g:100},{n:"Olio extravergine oliva",g:8}
  ]},
  {name:"Spuntino Sera",time:"22:00",foods:[
    {n:"Ricotta light",g:100}
  ]}
];

// Food database: n=name, c=category, k=kcal/100g, ca=carb, p=prot, f=fat, fi=fiber
var FOOD_DB = [
// CEREALI
{n:"Pasta di semola",c:"Cereali",k:356,ca:72,p:12.5,f:1.5,fi:2.7},
{n:"Pasta integrale",c:"Cereali",k:348,ca:66,p:13,f:2.5,fi:7.5},
{n:"Riso bianco",c:"Cereali",k:360,ca:79,p:6.7,f:0.6,fi:1},
{n:"Riso basmati",c:"Cereali",k:350,ca:77,p:7.5,f:0.6,fi:0.5},
{n:"Riso integrale",c:"Cereali",k:340,ca:72,p:7.5,f:2.5,fi:3.5},
{n:"Pane bianco",c:"Cereali",k:265,ca:49,p:8.5,f:3.2,fi:2.7},
{n:"Pane integrale",c:"Cereali",k:247,ca:41,p:8,f:3.5,fi:6.5},
{n:"Fette biscottate",c:"Cereali",k:408,ca:72,p:11,f:8,fi:3.5},
{n:"Farina 00",c:"Cereali",k:340,ca:76,p:11,f:0.7,fi:2},
{n:"Farina integrale",c:"Cereali",k:319,ca:62,p:12,f:2,fi:9},
{n:"Avena fiocchi",c:"Cereali",k:372,ca:62,p:13,f:7,fi:10},
{n:"Orzo perlato",c:"Cereali",k:319,ca:70,p:10,f:1.2,fi:9},
{n:"Farro",c:"Cereali",k:335,ca:67,p:15,f:2.5,fi:7},
{n:"Quinoa",c:"Cereali",k:368,ca:64,p:14,f:6,fi:7},
{n:"Cous cous",c:"Cereali",k:356,ca:73,p:12,f:0.6,fi:2},
{n:"Corn flakes",c:"Cereali",k:378,ca:84,p:7,f:1,fi:3},
{n:"Crackers",c:"Cereali",k:428,ca:68,p:10,f:12,fi:3},
{n:"Grissini",c:"Cereali",k:412,ca:68,p:12,f:10,fi:3},
{n:"Polenta (cruda)",c:"Cereali",k:347,ca:77,p:8,f:1.5,fi:2},
{n:"Tortellini freschi",c:"Cereali",k:300,ca:42,p:13,f:9,fi:1.5},
{n:"Gnocchi di patate",c:"Cereali",k:175,ca:36,p:4,f:1,fi:2},
// PROTEINE
{n:"Petto di pollo",c:"Proteine",k:110,ca:0,p:23,f:1.5,fi:0},
{n:"Coscia di pollo",c:"Proteine",k:177,ca:0,p:18,f:11,fi:0},
{n:"Tacchino petto",c:"Proteine",k:107,ca:0,p:24,f:1,fi:0},
{n:"Manzo magro",c:"Proteine",k:131,ca:0,p:22,f:5,fi:0},
{n:"Macinato bovino 5%",c:"Proteine",k:137,ca:0,p:21,f:6,fi:0},
{n:"Macinato bovino 15%",c:"Proteine",k:215,ca:0,p:18,f:15,fi:0},
{n:"Vitello",c:"Proteine",k:107,ca:0,p:21,f:2.5,fi:0},
{n:"Prosciutto cotto",c:"Proteine",k:132,ca:1,p:19.5,f:5.5,fi:0},
{n:"Prosciutto crudo",c:"Proteine",k:195,ca:0,p:26,f:10,fi:0},
{n:"Bresaola",c:"Proteine",k:151,ca:0,p:32,f:2.5,fi:0},
{n:"Tonno al naturale",c:"Proteine",k:103,ca:0,p:23,f:1,fi:0},
{n:"Tonno sott'olio",c:"Proteine",k:192,ca:0,p:26,f:10,fi:0},
{n:"Salmone fresco",c:"Proteine",k:208,ca:0,p:20,f:13,fi:0},
{n:"Salmone affumicato",c:"Proteine",k:142,ca:0,p:22,f:6,fi:0},
{n:"Merluzzo",c:"Proteine",k:82,ca:0,p:18,f:0.7,fi:0},
{n:"Orata",c:"Proteine",k:121,ca:0,p:20,f:4.5,fi:0},
{n:"Gamberi",c:"Proteine",k:85,ca:0,p:18,f:1.5,fi:0},
{n:"Sogliola",c:"Proteine",k:83,ca:0,p:17,f:1.5,fi:0},
{n:"Uova intere",c:"Proteine",k:143,ca:1,p:12.5,f:10,fi:0},
{n:"Albume d'uovo",c:"Proteine",k:47,ca:0.7,p:10.5,f:0.2,fi:0},
{n:"Tofu",c:"Proteine",k:76,ca:2,p:8,f:4.5,fi:0.5},
{n:"Seitan",c:"Proteine",k:120,ca:4,p:22,f:1.5,fi:0},
{n:"Hamburger bovino",c:"Proteine",k:254,ca:0,p:17,f:20,fi:0},
{n:"Wurstel pollo",c:"Proteine",k:175,ca:3,p:12,f:12,fi:0},
// LATTICINI
{n:"Latte intero",c:"Latticini",k:64,ca:4.8,p:3.3,f:3.6,fi:0},
{n:"Latte scremato",c:"Latticini",k:36,ca:5,p:3.5,f:0.3,fi:0},
{n:"Latte parz. scremato",c:"Latticini",k:46,ca:5,p:3.3,f:1.5,fi:0},
{n:"Yogurt greco 0%",c:"Latticini",k:57,ca:3.6,p:10,f:0.4,fi:0},
{n:"Yogurt greco 5%",c:"Latticini",k:97,ca:3.6,p:9,f:5,fi:0},
{n:"Yogurt bianco intero",c:"Latticini",k:63,ca:4.7,p:3.5,f:3.5,fi:0},
{n:"Yogurt magro 0.1%",c:"Latticini",k:40,ca:5.5,p:4,f:0.1,fi:0},
{n:"Mozzarella",c:"Latticini",k:253,ca:1,p:18,f:20,fi:0},
{n:"Mozzarella light",c:"Latticini",k:163,ca:1.5,p:20,f:9,fi:0},
{n:"Ricotta vaccina",c:"Latticini",k:146,ca:3,p:8,f:11,fi:0},
{n:"Ricotta light",c:"Latticini",k:107,ca:4,p:10,f:5.5,fi:0},
{n:"Parmigiano Reggiano",c:"Latticini",k:392,ca:0,p:33,f:28,fi:0},
{n:"Grana Padano",c:"Latticini",k:398,ca:0,p:33,f:29,fi:0},
{n:"Fiocchi di latte",c:"Latticini",k:98,ca:3,p:11,f:4.5,fi:0},
{n:"Formaggio spalmabile light",c:"Latticini",k:135,ca:5,p:8,f:9,fi:0},
{n:"Burrata",c:"Latticini",k:321,ca:1,p:15,f:29,fi:0},
{n:"Stracchino",c:"Latticini",k:300,ca:0.5,p:18,f:25,fi:0},
{n:"Skyr",c:"Latticini",k:63,ca:4,p:11,f:0.2,fi:0},
// VERDURE
{n:"Zucchine",c:"Verdure",k:17,ca:3,p:1.2,f:0.3,fi:1},
{n:"Pomodori",c:"Verdure",k:18,ca:3.9,p:0.9,f:0.2,fi:1.2},
{n:"Pomodori pelati",c:"Verdure",k:24,ca:4,p:1,f:0.2,fi:1},
{n:"Insalata mista",c:"Verdure",k:18,ca:2.8,p:1.3,f:0.2,fi:1.5},
{n:"Spinaci",c:"Verdure",k:23,ca:3.6,p:2.9,f:0.4,fi:2.2},
{n:"Broccoli",c:"Verdure",k:34,ca:7,p:2.8,f:0.4,fi:2.6},
{n:"Carote",c:"Verdure",k:41,ca:10,p:0.9,f:0.2,fi:2.8},
{n:"Peperoni",c:"Verdure",k:26,ca:6,p:1,f:0.2,fi:1.8},
{n:"Melanzane",c:"Verdure",k:25,ca:6,p:1,f:0.2,fi:3},
{n:"Funghi champignon",c:"Verdure",k:22,ca:3.3,p:3.1,f:0.3,fi:1},
{n:"Cipolla",c:"Verdure",k:40,ca:9,p:1.1,f:0.1,fi:1.7},
{n:"Fagiolini",c:"Verdure",k:31,ca:7,p:1.8,f:0.1,fi:3.4},
{n:"Cavolfiore",c:"Verdure",k:25,ca:5,p:2,f:0.3,fi:2},
{n:"Finocchio",c:"Verdure",k:15,ca:3,p:1.2,f:0.2,fi:2.2},
{n:"Rucola",c:"Verdure",k:25,ca:3.7,p:2.6,f:0.7,fi:1.6},
{n:"Patate",c:"Verdure",k:77,ca:17,p:2,f:0.1,fi:2.2},
{n:"Patate dolci",c:"Verdure",k:86,ca:20,p:1.6,f:0.1,fi:3},
{n:"Carciofi",c:"Verdure",k:47,ca:11,p:3.3,f:0.2,fi:5.4},
{n:"Piselli",c:"Verdure",k:81,ca:14,p:5.4,f:0.4,fi:5.7},
{n:"Mais in scatola",c:"Verdure",k:104,ca:21,p:3.2,f:1.2,fi:2.4},
{n:"Asparagi",c:"Verdure",k:20,ca:3.9,p:2.2,f:0.1,fi:2.1},
// FRUTTA
{n:"Mela",c:"Frutta",k:52,ca:14,p:0.3,f:0.2,fi:2.4},
{n:"Banana",c:"Frutta",k:89,ca:23,p:1.1,f:0.3,fi:2.6},
{n:"Arancia",c:"Frutta",k:47,ca:12,p:0.9,f:0.1,fi:2.4},
{n:"Fragole",c:"Frutta",k:32,ca:8,p:0.7,f:0.3,fi:2},
{n:"Mirtilli",c:"Frutta",k:57,ca:14,p:0.7,f:0.3,fi:2.4},
{n:"Uva",c:"Frutta",k:69,ca:18,p:0.7,f:0.2,fi:0.9},
{n:"Kiwi",c:"Frutta",k:61,ca:15,p:1.1,f:0.5,fi:3},
{n:"Pera",c:"Frutta",k:57,ca:15,p:0.4,f:0.1,fi:3.1},
{n:"Pesca",c:"Frutta",k:39,ca:10,p:0.9,f:0.3,fi:1.5},
{n:"Ananas",c:"Frutta",k:50,ca:13,p:0.5,f:0.1,fi:1.4},
{n:"Mandarino",c:"Frutta",k:53,ca:13,p:0.8,f:0.3,fi:1.8},
{n:"Limone (succo)",c:"Frutta",k:22,ca:7,p:0.4,f:0.2,fi:0.3},
{n:"Avocado",c:"Frutta",k:160,ca:9,p:2,f:15,fi:7},
{n:"Cocco disidratato",c:"Frutta",k:660,ca:24,p:6,f:62,fi:16},
{n:"Datteri secchi",c:"Frutta",k:277,ca:75,p:1.8,f:0.2,fi:7},
// LEGUMI
{n:"Lenticchie cotte",c:"Legumi",k:116,ca:20,p:9,f:0.4,fi:8},
{n:"Ceci cotti",c:"Legumi",k:164,ca:27,p:9,f:2.6,fi:8},
{n:"Fagioli borlotti cotti",c:"Legumi",k:125,ca:22,p:8.5,f:0.5,fi:6},
{n:"Fagioli cannellini cotti",c:"Legumi",k:118,ca:21,p:8,f:0.5,fi:6},
{n:"Edamame",c:"Legumi",k:121,ca:9,p:12,f:5,fi:5},
{n:"Fave cotte",c:"Legumi",k:88,ca:14,p:8,f:0.7,fi:5},
// CONDIMENTI
{n:"Olio extravergine oliva",c:"Condimenti",k:884,ca:0,p:0,f:100,fi:0},
{n:"Olio di semi",c:"Condimenti",k:884,ca:0,p:0,f:100,fi:0},
{n:"Burro",c:"Condimenti",k:717,ca:0.1,p:0.9,f:81,fi:0},
{n:"Maionese",c:"Condimenti",k:680,ca:1,p:1,f:75,fi:0},
{n:"Aceto balsamico",c:"Condimenti",k:88,ca:17,p:0.5,f:0,fi:0},
{n:"Salsa di soia",c:"Condimenti",k:53,ca:5,p:8,f:0.1,fi:0},
{n:"Pesto alla genovese",c:"Condimenti",k:435,ca:6,p:5,f:42,fi:2},
{n:"Passata di pomodoro",c:"Condimenti",k:24,ca:4.5,p:1.2,f:0.1,fi:1.5},
{n:"Ketchup",c:"Condimenti",k:112,ca:26,p:1.5,f:0.1,fi:0.5},
{n:"Miele",c:"Condimenti",k:304,ca:82,p:0.3,f:0,fi:0},
{n:"Zucchero",c:"Condimenti",k:400,ca:100,p:0,f:0,fi:0},
{n:"Marmellata",c:"Condimenti",k:250,ca:60,p:0.5,f:0.1,fi:1},
// FRUTTA SECCA
{n:"Mandorle",c:"Frutta Secca",k:579,ca:22,p:21,f:50,fi:12},
{n:"Noci",c:"Frutta Secca",k:654,ca:14,p:15,f:65,fi:7},
{n:"Arachidi",c:"Frutta Secca",k:567,ca:16,p:26,f:49,fi:9},
{n:"Anacardi",c:"Frutta Secca",k:553,ca:30,p:18,f:44,fi:3},
{n:"Pistacchi",c:"Frutta Secca",k:560,ca:28,p:20,f:45,fi:10},
{n:"Burro di arachidi",c:"Frutta Secca",k:588,ca:20,p:25,f:50,fi:6},
{n:"Nocciole",c:"Frutta Secca",k:628,ca:17,p:15,f:61,fi:10},
// SNACK
{n:"Cioccolato fondente 70%",c:"Snack",k:530,ca:33,p:8,f:40,fi:10},
{n:"Cioccolato al latte",c:"Snack",k:535,ca:56,p:7,f:31,fi:2},
{n:"Gallette di riso",c:"Snack",k:387,ca:81,p:8,f:3,fi:4},
{n:"Barretta proteica",c:"Snack",k:350,ca:30,p:30,f:12,fi:5},
{n:"Biscotti secchi",c:"Snack",k:416,ca:72,p:7,f:11,fi:2.5},
{n:"Croissant",c:"Snack",k:406,ca:42,p:7,f:22,fi:2},
{n:"Gelato alla vaniglia",c:"Snack",k:207,ca:24,p:3.5,f:11,fi:0.5},
{n:"Tiramisù",c:"Snack",k:283,ca:30,p:7,f:15,fi:0.5},
// BEVANDE
{n:"Succo d'arancia",c:"Bevande",k:45,ca:10,p:0.7,f:0.2,fi:0.2},
{n:"Bevanda di soia",c:"Bevande",k:33,ca:1.2,p:3.3,f:1.8,fi:0.4},
{n:"Bevanda di avena",c:"Bevande",k:43,ca:6.5,p:0.3,f:1.5,fi:0.8},
{n:"Bevanda di mandorla",c:"Bevande",k:22,ca:2.7,p:0.5,f:1.1,fi:0.2},
// PREPARATI
{n:"Pizza margherita",c:"Preparati",k:271,ca:33,p:11,f:10,fi:2},
{n:"Piadina",c:"Preparati",k:340,ca:50,p:8,f:12,fi:2},
{n:"Focaccia genovese",c:"Preparati",k:280,ca:38,p:7,f:11,fi:2},
{n:"Risotto (base cotto)",c:"Preparati",k:140,ca:25,p:3,f:3,fi:0.5},
{n:"Lasagna alla bolognese",c:"Preparati",k:172,ca:15,p:10,f:8,fi:1},
{n:"Minestrone",c:"Preparati",k:35,ca:6,p:1.5,f:0.5,fi:2},
{n:"Insalata di riso",c:"Preparati",k:155,ca:24,p:4,f:5,fi:1},
// INTEGRATORI
{n:"Proteine whey (scoop 30g)",c:"Integratori",k:120,ca:3,p:24,f:1.5,fi:0},
{n:"Creatina monoidrato",c:"Integratori",k:0,ca:0,p:0,f:0,fi:0},
{n:"Maltodestrine",c:"Integratori",k:380,ca:95,p:0,f:0,fi:0}
];
