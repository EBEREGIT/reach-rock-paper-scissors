import { loadStdlib, ask } from "@reach-sh/stdlib";
import * as backend from "./build/index.main.mjs";
const stdlib = loadStdlib();

// checking for who is playing
const isAlice = await ask.ask(`Are you Alice?`, ask.yesno);
// if it is true, then it is Alice else it is Bob
const who = isAlice ? "Alice" : "Bob";

console.log(`Starting Rock, Paper, Scissors! as ${who}`);

let acc = null;

// ask to create account
const createAcc = await ask.ask(
  `Would you like to create an account? (only possible on devnet)`,
  ask.yesno
);

// if agrees to create account, do so
if (createAcc) {
  acc = await stdlib.newTestAccount(stdlib.parseCurrency(1000));
} else {
  // else enter password from before
  const secret = await ask.ask(`What is your account secret?`, (x) => x);
  acc = await stdlib.newAccountFromSecret(secret);
}

let ctc = null;

// if it is Alice, create the contract and hold the info for later
if (isAlice) {
  ctc = acc.contract(backend);
  ctc.getInfo().then((info) => {
    console.log(`The contract is deployed as = ${JSON.stringify(info)}`);
  });
} else {
  // else that means the info already exist.
  // ask for it, parse it and process it
  const info = await ask.ask(
    `Please paste the contract information:`,
    JSON.parse
  );
  ctc = acc.contract(backend, info);
}

// helper functions
const fmt = (x) => stdlib.formatCurrency(x, 4);
const getBalance = async () => fmt(await stdlib.balanceOf(acc));

const before = await getBalance();
console.log(`Your balance is ${before}`);

const interact = { ...stdlib.hasRandom };

// timeout handle
interact.informTimeout = () => {
  console.log(`There was a timeout.`);
  process.exit(1);
};

// if it is Alice, setup a wager and a deadline
if (isAlice) {
  const amt = await ask.ask(
    `How much do you want to wager?`,
    stdlib.parseCurrency
  );
  interact.wager = amt;
  interact.deadline = { ETH: 100, ALGO: 100, CFX: 1000 }[stdlib.connector];
} else {
  // else Bob accepts the wager
  interact.acceptWager = async (amt) => {
    const accepted = await ask.ask(
      `Do you accept the wager of ${fmt(amt)}?`,
      ask.yesno
    );

    // if not game is terminated
    if (!accepted) {
      process.exit(0);
    }
  };
}

// define the hands
const HAND = ["Rock", "Paper", "Scissors"];
const HANDS = {
  Rock: 0,
  R: 0,
  r: 0,
  Paper: 1,
  P: 1,
  p: 1,
  Scissors: 2,
  S: 2,
  s: 2,
};

// define the getHand method
interact.getHand = async () => {
  // get the hand when a number is inputted
  const hand = await ask.ask(`What hand will you play?`, (x) => {
    const hand = HANDS[x];
    if (hand === undefined) {
      throw Error(`Not a valid hand ${hand}`);
    }
    return hand;
  });
  console.log(`You played ${HAND[hand]}`);
  return hand;
};


const OUTCOME = ['Bob wins', 'Draw', 'Alice wins'];
interact.seeOutcome = async (outcome) => {
  console.log(`The outcome is: ${OUTCOME[outcome]}`);
};

const part = isAlice ? ctc.p.Alice : ctc.p.Bob;
await part(interact);

const after = await getBalance();
console.log(`Your balance is now ${after}`);

ask.done();
