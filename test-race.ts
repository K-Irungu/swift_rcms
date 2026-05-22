// test-race.ts
// const BASE_URL = "http://localhost:3000";

// const payload = {
//   fullName: "Kevin Irungu",
//   email: "kirungu481@gmail.com",
//   phoneNumber: "0797154309",
// };

// async function sendRequest(label: string) {
//   const res = await fetch(`${BASE_URL}/api/auth/register`, {
//     method: "POST",
//     headers: { "Content-Type": "application/json" },
//     body: JSON.stringify(payload),
//   });

//   const data = await res.json();
//   console.log(`${label} → status: ${res.status}`, data);
// }

async function main() {
  console.log("Firing all requests simultaneously...\n");

//   // Promise.all fires both at the exact same time
//   await Promise.all([
//     sendRequest("Request A"),
//     sendRequest("Request B"),
//   ]);


// Attacker's script
const requests = Array.from({ length: 500 }, () =>
  fetch("https://app.swiftrcms.co.ke/api/auth/register", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      fullName: "Kevin Irungu",
      email: "kirungu481@gmail.com",
      phoneNumber: "0797154309",
    }),
  })
);

await Promise.all(requests); // 500 requests fired simultaneously
}

main();




