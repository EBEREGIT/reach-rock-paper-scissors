import React from "react";
import AppViews from "./views/AppViews";
import DeployerViews from "./views/DeployerViews";
import AttacherViews from "./views/AttacherViews";
import { renderDOM, renderView } from "./views/render";
import "./index.css";
import * as backend from "./build/index.main.mjs";
import { loadStdlib } from "@reach-sh/stdlib";
const reach = loadStdlib(process.env);

const handToInt = { ROCK: 0, PAPER: 1, SCISSORS: 2 };
const intToOutcome = ["Bob wins!", "Draw!", "Alice wins!"];
const { standardUnit } = reach;
const defaults = { defaultFundAmt: "10", defaultWager: "3", standardUnit };

// application
class App extends React.Component {
  // set up the initial states of the view and others
  constructor(props) {
    super(props);
    this.state = { view: "ConnectAccount", ...defaults };
  }
  async componentDidMount() {
    // get the logged in account
    const acc = await reach.getDefaultAccount();

    // get the logged in account balance
    const balAtomic = await reach.balanceOf(acc);

    // format the account balance
    const bal = reach.formatCurrency(balAtomic, 4);

    // check if the user's details is accessible
    this.setState({ acc, bal });
    // true
    if (await reach.canFundFromFaucet()) {
      this.setState({ view: "FundAccount" });
    } else {
      // false
      this.setState({ view: "DeployerOrAttacher" });
    }
  }

  // when fundAccount button is clicked
  async fundAccount(fundAmount) {
    // transfer funds from the faucet to the user's account
    await reach.fundFromFaucet(this.state.acc, reach.parseCurrency(fundAmount));

    // set the view to choose role
    this.setState({ view: "DeployerOrAttacher" });
  }

  // when skip button is clicked
  async skipFundAccount() {
    // set the view to choose role
    this.setState({ view: "DeployerOrAttacher" });
  }

  // if they click on attacker
  selectAttacher() {
    this.setState({ view: "Wrapper", ContentView: Attacher });
  }

  // if they click on deployer
  selectDeployer() {
    this.setState({ view: "Wrapper", ContentView: Deployer });
  }

  // render the view depending on the canFundFromFaucet result
  render() {
    return renderView(this, AppViews);
  }
}

// Player class
class Player extends React.Component {
  // reach function that gives a random number
  random() {
    return reach.hasRandom.random();
  }

  // get hand function
  async getHand() {
    // Fun([], UInt)
    const hand = await new Promise((resolveHandP) => {
      // set view to GetHand
      this.setState({ view: "GetHand", playable: true, resolveHandP });
    });

    // set component to WaitingForResults while waiting for
    // the hand promise to be resolved
    this.setState({ view: "WaitingForResults", hand });
    return handToInt[hand];
  }

  // show outcome when done
  seeOutcome(i) {
    this.setState({ view: "Done", outcome: intToOutcome[i] });
  }

  // show timeout when timed out
  informTimeout() {
    this.setState({ view: "Timeout" });
  }

  // when a choice of hand is made
  playHand(hand) {
    this.state.resolveHandP(hand);
  }
}

// Alice
class Deployer extends Player {
  constructor(props) {
    super(props);
    this.state = { view: "SetWager" };
  }

  // when set wager button is clicked
  setWager(wager) {
    this.setState({ view: "Deploy", wager });
  }

  // when deploy button is clicked
  async deploy() {
    // deploy contract
    const ctc = this.props.acc.contract(backend);
    // set the view to Deploying
    this.setState({ view: "Deploying", ctc });
    // set wager
    this.wager = reach.parseCurrency(this.state.wager); // UInt
    // set deadline based on connector
    this.deadline = { ETH: 10, ALGO: 100, CFX: 1000 }[reach.connector]; // UInt
    // start running the program as Alice
    backend.Alice(ctc, this);
    // get the deployed contract info as JSON
    const ctcInfoStr = JSON.stringify(await ctc.getInfo(), null, 2);
    // set the view to WaitingForAttacher
    this.setState({ view: "WaitingForAttacher", ctcInfoStr });
  }
  render() {
    return renderView(this, DeployerViews);
  }
}

// Bob
class Attacher extends Player {
  constructor(props) {
    super(props);
    this.state = { view: "Attach" };
  }

  attach(ctcInfoStr) {
    // deploy the contract here
    const ctc = this.props.acc.contract(backend, JSON.parse(ctcInfoStr));
    this.setState({ view: "Attaching" });

    // add the second participant
    backend.Bob(ctc, this);
  }

  async acceptWager(wagerAtomic) {
    // Fun([UInt], Null)
    const wager = reach.formatCurrency(wagerAtomic, 4);

    // set view to AcceptTerms
    return await new Promise((resolveAcceptedP) => {
      this.setState({ view: "AcceptTerms", wager, resolveAcceptedP });
    });
  }

  // if terms are accepted
  termsAccepted() {
    this.state.resolveAcceptedP();
    // display WaitingForTurn
    this.setState({ view: "WaitingForTurn" });
  }

  render() {
    return renderView(this, AttacherViews);
  }
}

renderDOM(<App />);
