import { loadStdlib } from "@reach-sh/stdlib";
import * as backend from "./build/index.main.mjs";
const stdlib = loadStdlib();

// setup an account balance for both participants
const startingBalance = stdlib.parseCurrency(100);
const accAlice = await stdlib.newTestAccount(startingBalance);
const accBob = await stdlib.newTestAccount(startingBalance);

// function to format the currency to 4 decimal places
const fmt = (x) => stdlib.formatCurrency(x, 4);

// function to get the initial balace of a player before the game begins
const getBalance = async (who) => fmt(await stdlib.balanceOf(who));

// the account balances of the participants
const beforeAlice = await getBalance(accAlice);
const beforeBob = await getBalance(accBob);

// contact deployment
const ctcAlice = accAlice.contract(backend);
const ctcBob = accBob.contract(backend, ctcAlice.getInfo());

// Hand and outcome variable definition
const HAND = ["Rock", "Paper", "Scissors"];
const OUTCOME = ["Bob wins", "Draw", "Alice wins"];

// Player function definition
// contains things that the participants can do
const Player = (Who) => ({
  ...stdlib.hasRandom,
  // gets the hand the participant has decided to show
  getHand: () => {
    const hand = Math.floor(Math.random() * 3);
    console.log(`${Who} played ${HAND[hand]}`);
    return hand;
  },

  // reveals the outcome of their choice of hand
  seeOutcome: (outcome) => {
    console.log(`${Who} saw outcome ${OUTCOME[outcome]}`);
  },

  // tell when there is non-participation
  informTimeout: () => {
    console.log(`${Who} observed a timeout`);
  },
});

await Promise.all([
  ctcAlice.p.Alice({
    ...Player("Alice"),
    wager: stdlib.parseCurrency(5),
    deadline: 10,
  }),
  ctcBob.p.Bob({
    ...Player("Bob"),

    // bob accepts the wager if he doesn't delay
    acceptWager: async (amt) => {
      // <-- async now
      if (Math.random() <= 0.5) {
        for (let i = 0; i < 10; i++) {
          console.log(`  Bob takes his sweet time...`);
          await stdlib.wait(1);
        }
      } else {
        console.log(`Bob accepts the wager of ${fmt(amt)}.`);
      }
    },
  }),
]);

const afterAlice = await getBalance(accAlice);
const afterBob = await getBalance(accBob);

console.log(`Alice went from ${beforeAlice} to ${afterAlice}.`);
console.log(`Bob went from ${beforeBob} to ${afterBob}.`);
