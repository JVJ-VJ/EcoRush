/**
 * ECO RUSH — Question Bank & Round Definitions
 * 100% Authoritative Source of Truth from eco_rush_web-1.html
 */

const BANK = {
  "♻️ WASTE WARRIOR": [
    ["A banana peel belongs mainly in:", ["Wet/organic waste", "E-waste", "Glass waste", "Metal waste"], 0],
    ["Your old phone retires. What should you do?", ["Throw it with food waste", "Give it to an e-waste collection point", "Throw it into a river", "Burn it"], 1],
    ["Which is the eco-smart shopping choice?", ["Take a new plastic bag every time", "Carry a reusable bag", "Take five bags just in case", "Throw the bag away immediately"], 1],
    ["A clean glass bottle can often be:", ["Reused or recycled", "Thrown into a river", "Mixed with food waste", "Burned"], 0],
    ["Which is a sneaky waste problem?", ["Repairing things", "Throwing batteries into normal waste", "Reusing containers", "Buying only what you need"], 1],
    ["You have a cardboard box. Best option?", ["Reuse or recycle it", "Pour oil on it", "Throw it in a lake", "Burn it indoors"], 0],
    ["Which habit creates less waste?", ["Repair before replacing", "Replace everything immediately", "Buy unnecessary duplicates", "Throw reusable items away"], 0],
    ["TRICK QUESTION 😈 Recycling is:", ["The only environmental solution", "Useful, but reducing and reusing can come first", "A reason to buy unlimited things", "A way to make waste disappear"], 1]
  ],
  "💧 WATER RESCUE": [
    ["A tap is dripping all day. What should you do?", ["Ignore it", "Fix or report the leak", "Open another tap", "Decorate the tap"], 1],
    ["Rainwater harvesting means:", ["Collecting and storing rainwater", "Making rain fall", "Boiling rain", "Sending rain into drains"], 0],
    ["Which shower habit saves water?", ["Taking shorter showers", "Leaving the shower running", "Taking extra-long showers", "Running the shower for fun"], 0],
    ["Which can reduce garden water use?", ["Watering appropriately", "Flooding the garden", "Leaving a hose running", "Watering the road"], 0],
    ["Why should chemicals not be poured into drains?", ["They can pollute water", "They make rivers cleaner", "They create drinking water", "They help fish breathe"], 0],
    ["A river has lots of plastic. Best long-term solution?", ["Keep adding plastic", "Prevent litter and improve waste collection", "Move the plastic somewhere else", "Ignore it"], 1],
    ["Which is a simple water-saving habit?", ["Turn off the tap while brushing", "Keep the tap running", "Wash one spoon for 20 minutes", "Ignore leaks"], 0],
    ["The city's reservoir is low. Best plan?", ["Waste more water", "Fix leaks and reduce unnecessary use", "Pollute another lake", "Ignore the problem"], 1]
  ],
  "🌳 FOREST GUARDIAN": [
    ["Deforestation means:", ["Loss or removal of forests", "Planting flowers", "Cleaning beaches", "Recycling paper"], 0],
    ["Why are forests important?", ["They support ecosystems and biodiversity", "They create plastic", "They stop all rain", "They remove every pollutant"], 0],
    ["Which action helps wildlife?", ["Protecting habitats", "Destroying nesting areas", "Dumping waste in forests", "Taking wild animals home"], 0],
    ["A healthy tree is blocking your view. Best response?", ["Consider alternatives before cutting it", "Cut every tree", "Pour chemicals on it", "Burn it"], 0],
    ["Which saves paper?", ["Use both sides when practical", "Print everything twice", "Throw unused paper away", "Photocopy blank pages"], 0],
    ["Why isn't planting trees a magic solution?", ["Trees don't matter", "Existing forests and reducing pollution also matter", "Trees cause pollution", "Trees eliminate the need for clean energy"], 1],
    ["When a habitat is destroyed, who can be affected?", ["Local wildlife", "Only rocks", "Only buildings", "Nobody"], 0],
    ["A healthy forest contains:", ["Only one species", "Plants, animals, soil and water working together", "No insects", "Only trees"], 1]
  ],
  "⚡ ENERGY BATTLE": [
    ["Which is renewable energy?", ["Solar energy", "Coal", "Diesel", "Petrol"], 0],
    ["You leave a room for a long time. What should you do?", ["Turn off unnecessary lights", "Turn on more lights", "Leave everything running", "Open the refrigerator"], 0],
    ["For a short trip, which can reduce fuel use?", ["Walk or cycle when safe", "Drive around unnecessarily", "Leave the car idling", "Take a separate car every time"], 0],
    ["Why are LED bulbs useful?", ["They generally use less electricity", "They create coal", "They need no electricity", "They create sunlight"], 0],
    ["Energy efficiency means:", ["Getting the same useful result with less energy", "Wasting electricity", "Using energy for no reason", "Leaving everything switched on"], 0],
    ["A charger isn't being used. What is sensible?", ["Unplug or switch it off when appropriate", "Add more chargers", "Leave it running forever", "Put it in water"], 0],
    ["Which pair is renewable?", ["Wind and solar", "Coal and petrol", "Diesel and coal", "Petrol and gas"], 0],
    ["TRICK QUESTION 😈 Buying something new is:", ["Always greener", "Not necessarily; repair and reuse can be better", "Always pollution-free", "Always better than repairing"], 1]
  ],
  "🚨 PLANET FINAL BATTLE": [
    ["Your city has overflowing waste bins. Best solution?", ["Improve waste reduction, sorting and collection", "Move rubbish to a park", "Burn everything openly", "Throw it into a river"], 0],
    ["A school wants to save electricity. Best plan?", ["Efficient lights + switch-off habits", "Keep every light on", "Buy more extension cords", "Run fans in empty rooms"], 0],
    ["Which plan protects water?", ["Fix leaks and reduce waste", "Use water faster", "Dump waste into drains", "Ignore pollution"], 0],
    ["A forest project wants maximum benefit. Better approach?", ["Protect habitats and plant suitable trees", "Plant random trees everywhere", "Remove wildlife", "Replace forests with plastic trees"], 0],
    ["What is an environmental superpower?", ["One giant action once", "Consistent smart choices and teamwork", "Doing nothing", "Blaming everyone else"], 1],
    ["TRICKY 😈 If something is recyclable, can you throw it anywhere?", ["Yes", "No, proper collection and sorting still matter", "Only into rivers", "Only into food waste"], 1],
    ["Your team has 100 Eco Coins. Best investment?", ["Waste, water, habitat and energy improvements", "Disposable products", "A plastic statue", "A landfill in the playground"], 0],
    ["👑 FINAL BOSS: What can make the biggest difference?", ["The planet is someone else's problem", "Good choices + good systems + teamwork", "Recycling means we can waste anything", "Only one person can save Earth"], 1]
  ]
};

const rounds = Object.keys(BANK);

// Attach globally for browser / Node environments
if (typeof window !== "undefined") {
  window.BANK = BANK;
  window.rounds = rounds;
}

if (typeof module !== "undefined" && module.exports) {
  module.exports = { BANK, rounds };
}
