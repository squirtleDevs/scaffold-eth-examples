import React, { useCallback, useEffect, useState, useMemo } from "react";
import { BrowserRouter, Switch, Route, Link } from "react-router-dom";
import { CaretUpOutlined, ScanOutlined, SendOutlined } from "@ant-design/icons";
import QrReader from "react-qr-reader";
import "antd/dist/antd.css";
import {  StaticJsonRpcProvider, JsonRpcProvider, Web3Provider,InfuraProvider } from "@ethersproject/providers";
import "./App.css";
import { Row, Col, Button, Menu, Alert, Switch as SwitchD, notification, Modal, Input } from "antd";
import Web3Modal from "web3modal";
import WalletConnectProvider from "@walletconnect/web3-provider";
import WalletConnect from "@walletconnect/client";
import { useUserAddress } from "eth-hooks";
import { providers, utils } from "ethers";
import { Balance, Header, Account, Faucet, Ramp, Contract, GasGauge, Address, ThemeSwitch, AddressInput, WCcomponent, EtherInput, Blockie  } from "./components";
import { useExchangePrice, useGasPrice, useUserProvider, useContractLoader, useContractReader, useEventListener, useBalance, useExternalContractLoader, useOnBlock, useLocalStorage } from "./hooks";
import { Transactor } from "./helpers";
import { formatEther, parseEther } from "@ethersproject/units";
//import Hints from "./Hints";
import { Hints, ExampleUI, Subgraph } from "./views"
import { useThemeSwitcher } from "react-css-theme-switcher";
import { INFURA_ID, DAI_ADDRESS, DAI_ABI, NETWORK, NETWORKS } from "./constants";
import { CreateTransaction, Transactions, Owners, FrontPage, DaiSwap } from "./views"
import { Interface } from "ethers/lib/utils";
import Gun from 'gun'


const axios = require("axios");

/*
    Welcome to 🏗 scaffold-eth !

    Code:
    https://github.com/austintgriffith/scaffold-eth

    Support:
    https://t.me/joinchat/KByvmRe5wkR-8F_zz6AjpA
    or DM @austingriffith on twitter or telegram

    You should get your own Infura.io ID and put it in `constants.js`
    (this is your connection to the main Ethereum network for ENS etc.)


    🌏 EXTERNAL CONTRACTS:
    You can also bring in contract artifacts in `constants.js`
    (and then use the `useExternalContractLoader()` hook!)
*/


/// 📡 What chain are your contracts deployed to?
const targetNetwork = NETWORKS['rinkeby']; // <------- select your target frontend network (localhost, rinkeby, xdai, mainnet)

// const poolServerUrl = "https://backend.multisig.holdings:49832/"
const poolServerUrl = "http://localhost:49832/"

// 😬 Sorry for all the console logging
const DEBUG = true

//Required for punkwallet.io portions --- still need to figure out calldatascheme
const { confirm } = Modal;
const { ethers } = require("ethers");

// 🛰 providers
if(DEBUG) console.log("📡 Connecting to Mainnet Ethereum");
// const mainnetProvider = getDefaultProvider("mainnet", { infura: INFURA_ID, etherscan: ETHERSCAN_KEY, quorum: 1 });
// const mainnetProvider = new InfuraProvider("mainnet",INFURA_ID);
//
// attempt to connect to our own scaffold eth rpc and if that fails fall back to infura...
const scaffoldEthProvider = new JsonRpcProvider("https://rpc.scaffoldeth.io:48544")
const mainnetInfura = new JsonRpcProvider("https://mainnet.infura.io/v3/" + INFURA_ID)
// ( ⚠️ Getting "failed to meet quorum" errors? Check your INFURA_I

// 🏠 Your local provider is usually pointed at your local blockchain
const localProviderUrl = targetNetwork.rpcUrl;
// as you deploy to other networks you can set REACT_APP_PROVIDER=https://dai.poa.network in packages/react-app/.env
const localProviderUrlFromEnv = process.env.REACT_APP_PROVIDER ? process.env.REACT_APP_PROVIDER : localProviderUrl;
if(DEBUG) console.log("🏠 Connecting to provider:", localProviderUrlFromEnv);
const localProvider = new StaticJsonRpcProvider(localProviderUrlFromEnv);


// 🔭 block explorer URL
const blockExplorer = targetNetwork.blockExplorer;




function App(props) {

  const mainnetProvider = (scaffoldEthProvider && scaffoldEthProvider._network) ? scaffoldEthProvider : mainnetInfura

  const [injectedProvider, setInjectedProvider] = useState();
  /* 💵 This hook will get the price of ETH from 🦄 Uniswap: */
  const price = useExchangePrice(targetNetwork,mainnetProvider);

  //more punkwallet things
  let startingAddress = "";
  if (window.location.pathname) {
  const incoming = window.location.pathname.replace("/", "");
  if (incoming && ethers.utils.isAddress(incoming)) {
    startingAddress = incoming;
    window.history.pushState({}, "", "/");
  }}

  // punkwallet usestate/uselocalstorage constants
const [walletConnectTx, setWalletConnectTx] = useState();
const [toAddress, setToAddress] = useLocalStorage("Multisig addy", startingAddress, 120000);
const [toWc, setToWC] = useLocalStorage();
const [data, setData] = useLocalStorage("data", "0x");
const [amount, setAmount] = useLocalStorage("amount", "0");
const [ walletConnectUrl, setWalletConnectUrl ] = useState()
const [walletModalData, setWalletModalData] = useState()
const [ connected, setConnected ] = useState()
const [ wallectConnectConnector, setWallectConnectConnector ] = useState()

const [customNonce, setCustomNonce] = useState();
const [to, setTo] = useLocalStorage("to");
const [isCreateTxnEnabled, setCreateTxnEnabled] = useState(true);
const [decodedDataState, setDecodedData] = useState();
const [methodName, setMethodName] = useState();
const [selectDisabled, setSelectDisabled] = useState(false);
let decodedData = "";

const [result, setResult] = useState();

//punkwallet calldata/wc scheme
useEffect(()=>{
  //walletConnectUrl
  if(walletConnectUrl){

    //CLEAR LOCAL STORAGE?!?
    localStorage.removeItem("walletconnect") // lololol

    console.log(" 📡 Connecting to Wallet Connect....",walletConnectUrl)
    const connector = new WalletConnect(
      {
        // Required
        uri: walletConnectUrl,
        // Required
        clientMeta: {
          description: "Forkable web wallet for small/quick transactions.",
          url: "https://punkwallet.io",
          icons: ["https://punkwallet.io/punk.png"],
          name: "🧑‍🎤 PunkWallet.io",
        },
      }/*,
      {
        // Optional
        url: "<YOUR_PUSH_SERVER_URL>",
        type: "fcm",
        token: token,
        peerMeta: true,
        language: language,
      }*/
    );

    setWallectConnectConnector(connector)
        
    // Subscribe to session requests
    connector.on("session_request", (error, payload) => {
      if (error) {
        throw error;
      }

      console.log("SESSION REQUEST")
      // Handle Session Request

      connector.approveSession({
        accounts: [                 // required
          readContracts ? readContracts[contractName].address : readContracts
        ],
        chainId: targetNetwork.chainId               // required
      })

      setConnected(true)


      /* payload:
      {
        id: 1,
        jsonrpc: '2.0'.
        method: 'session_request',
        params: [{
          peerId: '15d8b6a3-15bd-493e-9358-111e3a4e6ee4',
          peerMeta: {
            name: "WalletConnect Example",
            description: "Try out WalletConnect v1.0",
            icons: ["https://example.walletconnect.org/favicon.ico"],
            url: "https://example.walletconnect.org"
          }
        }]
      }
      */
    });

    // Subscribe to call requests
    connector.on("call_request", async (error, payload) => {
      if (error) {
        throw error;
      }

      console.log("REQUEST PERMISSION TO:",payload,payload.params[0])
      // Handle Call Request
      console.log("SETTING TO",payload.params[0].to)

      setWalletConnectTx(true)

      setToAddress(payload.params[0].to)
      setData(payload.params[0].data?payload.params[0].data:"0x0000")

      let bigNumber = ethers.BigNumber.from(payload.params[0].value)
      console.log("bigNumber",bigNumber)

      let newAmount = ethers.utils.formatEther(bigNumber)
      console.log("newAmount",newAmount)
      if(props.price){
        newAmount = newAmount.div(props.price)
      }
    setAmount(newAmount)

      /* payload:
      {
        id: 1,
        jsonrpc: '2.0'.
        method: 'eth_sign',
        params: [
          "0xbc28ea04101f03ea7a94c1379bc3ab32e65e62d3",
          "My email is john@doe.com - 1537836206101"
        ]
      }
      */

      setWalletModalData({payload:payload,connector: connector})

      confirm({
          width: "90%",
          size: "large",
          title: 'Send Transaction?',
          icon: <SendOutlined/>,
          content: <pre>{payload && JSON.stringify(payload.params, null, 2)}</pre>,
          onOk:async ()=>{

            console.log("customNonce", customNonce);
            const nonce = customNonce || (await readContracts[contractName].nonce());
            console.log("nonce", nonce);

            const newHash = await writeContracts[contractName].getTransactionHash(
              nonce,
              payload.params[0].to,
              payload.params[0].value,
              payload.params[0].data,
            );
            console.log("newHash", newHash);

            
            const signature = await userProvider.send("personal_sign", [newHash, address]);
            console.log("signature", signature);

            const recover = await readContracts[contractName].recover(newHash, signature);
            console.log("recover", recover);






            const isOwner = await readContracts[contractName].isOwner(recover);
            console.log("isOwner", isOwner);

            
            if (isOwner) {
                const newTx = gun.get(newHash).put({
                  chainId: localProvider._network.chainId,
                  address: readContracts[contractName].address,
                  nonce: nonce.toNumber(),
                  to: payload.params[0].to,
                  amount: ethers.utils.formatEther(bigNumber),
                  data: payload.params[0].data,
                  hash: newHash,
                  signatures: signature,
                  signers: recover,
                })
                gun.get(readContracts[contractName].address+"_"+localProvider._network.chainId).set(newTx)
                // IF SIG IS VALUE ETC END TO SERVER AND SERVER VERIFIES SIG IS RIGHT AND IS SIGNER BEFORE ADDING TY

                // console.log("RESULT", res.data);
                newTx.once((data)=>{console.log("RESULT", data)});



                // setResult(res.data.hash);
                newTx.once((data)=>{setResult(data.hash)});
                //setResult(res.data.hash);
                setTo(payload.params[0].to);
                setAmount(payload.params[0].value);
                setData(payload.params[0].data);
                //console.log("RESULT", res.data);
                console.log("nonce:", nonce)
                console.log("to:", payload.params[0].to)
  
                console.log("value:", ethers.utils.formatEther(bigNumber))
                console.log("data:", payload.params[0].data)
              } else {
                console.log("ERROR, NOT OWNER.");
                setResult("ERROR, NOT OWNER.");
              }
              // IF SIG IS VALUE ETC END TO SERVER AND SERVER VERIFIES SIG IS RIGHT AND IS SIGNER BEFORE ADDING TY






            
            //let msg = await writeContracts.MetaMultiSigWallet.getTransactionHash(nonce, payload.params[0].to, parseEther("" + parseFloat(payload.params[0].value).toFixed(12)), payload.params[0].data);
            //let msg = await userProvider.send(payload.method, payload.params);
           // let userSigner = userProvider.getSigner();
            //let result = await userSigner.signMessage(payload.params);
            //let msg2 = payload.params[0];


            //console.log("MSG:",ethers.utils.toUtf8Bytes(result).toString())

            //let userSigner = userProvider.getSigner()
            //result = await userSigner.signMessage(msg)
            //console.log("RESULT:", result)
            //console.log("msg", msg)

            

            //logging


            
            connector.approveRequest({
              id: payload.id,
              result: data
            });

            notification.info({
              message: "Wallet Connect Transaction Sent, Check the TX pool",
              description: data.hash,
              placement: "bottomRight",
            });
          },
          onCancel: ()=>{
            console.log('Cancel');
          },
        });

      //setIsWalletModalVisible(true)

      if(payload.method == "personal_sign"){
        console.log("SIGNING A MESSAGE!!!")
      }
       // const msg = payload.params[0]


      




    });

    connector.on("disconnect", (error, payload) => {
      if (error) {
        throw error;
      }
      console.log("disconnect")

      setTimeout(() => {
        window.location.reload();
      }, 1);

      // Delete connector
    });
  }
},[ walletConnectUrl ])

useMemo(() => {
  if (window.location.pathname) {
    if (window.location.pathname.indexOf("/wc") >= 0) {
      console.log("WALLET CONNECT!!!!!",window.location.search)
      let uri = window.location.search.replace("?uri=","")
      console.log("WC URI:",uri)
      setWalletConnectUrl(uri)
    }
  }
}, [injectedProvider, localProvider]);



console.log("startingAddress",startingAddress)

  /* 🔥 This hook will get the price of Gas from ⛽️ EtherGasStation */
  const gasPrice = useGasPrice(targetNetwork,"fast");
  // Use your injected provider from 🦊 Metamask or if you don't have it then instantly generate a 🔥 burner wallet.
  const userProvider = useUserProvider(injectedProvider, localProvider);
  const address = useUserAddress(userProvider);

  // You can warn the user if you would like them to be on a specific network
  let localChainId = localProvider && localProvider._network && localProvider._network.chainId
  let selectedChainId = userProvider && userProvider._network && userProvider._network.chainId

  // For more hooks, check out 🔗eth-hooks at: https://www.npmjs.com/package/eth-hooks

  // The transactor wraps transactions and provides notificiations
  const tx = Transactor(userProvider, gasPrice)

  // Faucet Tx can be used to send funds from the faucet
  const faucetTx = Transactor(localProvider, gasPrice)

  // 🏗 scaffold-eth is full of handy hooks like this one to get your balance:
  const yourLocalBalance = useBalance(localProvider, address);

  // Just plug in different 🛰 providers to get your balance on different chains:
  const yourMainnetBalance = useBalance(mainnetProvider, address);

  // Load in your local 📝 contract and read a value from it:
  const readContracts = useContractLoader(localProvider)

  // If you want to make 🔐 write transactions to your contracts, use the userProvider:
  const writeContracts = useContractLoader(userProvider)

  const contractName = "MetaMultiSigWallet"

  //📟 Listen for broadcast events
  const executeTransactionEvents = useEventListener(readContracts, contractName, "ExecuteTransaction", localProvider, 1);
  if(DEBUG) console.log("📟 executeTransactionEvents:",executeTransactionEvents)

  // keep track of a variable from the contract in the local React state:
  const isOwner = useContractReader(readContracts, contractName, "isOwner", [address])
  if(DEBUG) console.log("🤗 isOwner ("+address+"):",isOwner)

  // keep track of a variable from the contract in the local React state:
  const nonce = useContractReader(readContracts, contractName, "nonce")
  
  if(DEBUG) console.log("# nonce:",nonce)

  //📟 Listen for broadcast events
  const ownerEvents = useEventListener(readContracts, contractName, "Owner", localProvider, 1);
  if(DEBUG) console.log("📟 ownerEvents:",ownerEvents)

  // If you want to bring in the mainnet DAI contract it would look like:
  const mainnetDAIContract = useExternalContractLoader(mainnetProvider, DAI_ADDRESS, DAI_ABI)

  // If you want to call a function on a new block
  useOnBlock(mainnetProvider, () => {
    console.log(`⛓ A new mainnet block is here: ${mainnetProvider._lastBlockNumber}`)
  })

  // Then read your DAI balance like:
  const myMainnetDAIBalance = useContractReader({DAI: mainnetDAIContract},"DAI", "balanceOf",["0x34aA3F359A9D614239015126635CE7732c18fDF3"])

  // keep track of a variable from the contract in the local React state:
  const purpose = useContractReader(readContracts,"YourContract", "purpose")

  //📟 Listen for broadcast events
  const setPurposeEvents = useEventListener(readContracts, "YourContract", "SetPurpose", localProvider, 1);

  /*
  const addressFromENS = useResolveName(mainnetProvider, "austingriffith.eth");
  console.log("🏷 Resolved austingriffith.eth as:",addressFromENS)
  */

  //
  // 🧫 DEBUG 👨🏻‍🔬
  //
  useEffect(()=>{
    if(DEBUG && mainnetProvider && address && selectedChainId && yourLocalBalance && yourMainnetBalance && readContracts && writeContracts && mainnetDAIContract){
      console.log("_____________________________________ 🏗 scaffold-eth _____________________________________")
      console.log("🌎 mainnetProvider",mainnetProvider)
      console.log("🏠 localChainId",localChainId)
      console.log("👩‍💼 selected address:",address)
      console.log("🕵🏻‍♂️ selectedChainId:",selectedChainId)
      console.log("💵 yourLocalBalance",yourLocalBalance?formatEther(yourLocalBalance):"...")
      console.log("💵 yourMainnetBalance",yourMainnetBalance?formatEther(yourMainnetBalance):"...")
      console.log("📝 readContracts",readContracts)
      console.log("🌍 DAI contract on mainnet:",mainnetDAIContract)
      console.log("🔐 writeContracts",writeContracts)
    }
  }, [mainnetProvider, address, selectedChainId, yourLocalBalance, yourMainnetBalance, readContracts, writeContracts, mainnetDAIContract])


  let networkDisplay = ""
  if(localChainId && selectedChainId && localChainId != selectedChainId ){
    networkDisplay = (
      <div style={{zIndex:2, position:'absolute', right:0,top:60,padding:16}}>
        <Alert
          message={"⚠️ Wrong Network"}
          description={(
            <div>
              You have <b>{NETWORK(selectedChainId).name}</b> selected and you need to be on <b>{NETWORK(localChainId).name}</b>.
            </div>
          )}
          type="error"
          closable={false}
        />
      </div>
    )
  }else{
    networkDisplay = (
      <div style={{zIndex:-1, position:'absolute', right:154,top:28,padding:16,color:targetNetwork.color}}>
        {targetNetwork.name}
      </div>
    )
  }


  const signaturesRequired = useContractReader(readContracts, contractName, "signaturesRequired")
  if(DEBUG) console.log("✳️ signaturesRequired:",signaturesRequired)

  //event OpenStream( address indexed to, uint256 amount, uint256 frequency );
  const openStreamEvents = useEventListener(readContracts, contractName, "OpenStream", localProvider, 1);
  if(DEBUG) console.log("📟 openStreamEvents:",openStreamEvents)

  const withdrawStreamEvents = useEventListener(readContracts, contractName, "Withdraw", localProvider, 1);
  if(DEBUG) console.log("📟 withdrawStreamEvents:",withdrawStreamEvents)


  const loadWeb3Modal = useCallback(async () => {
    const provider = await web3Modal.connect();
    setInjectedProvider(new Web3Provider(provider));
  }, [setInjectedProvider]);

  useEffect(() => {
    if (web3Modal.cachedProvider) {
      loadWeb3Modal();
    }
  }, [loadWeb3Modal]);

  const [route, setRoute] = useState();
  useEffect(() => {
    setRoute(window.location.pathname)
  }, [setRoute]);

  let faucetHint = ""
  const faucetAvailable = localProvider && localProvider.connection && targetNetwork.name == "localhost"

  const [ faucetClicked, setFaucetClicked ] = useState( false );
  if(!faucetClicked&&localProvider&&localProvider._network&&localProvider._network.chainId==31337&&yourLocalBalance&&formatEther(yourLocalBalance)<=0){
    faucetHint = (
      <div style={{padding:16}}>
        <Button type={"primary"} onClick={()=>{
          faucetTx({
            to: address,
            value: parseEther("1"),
          });
          setFaucetClicked(true)
        }}>
          💰 Grab funds from the faucet ⛽️
        </Button>
      </div>
    )
  }

  const gun = Gun({
    peers: ['http:localhost:3000/gun'] // Put the relay node that you want here
  })

  return (
    <div className="App">

      {/* ✏️ Edit the header and change the title to your project name */}
      <Header />
      {networkDisplay}
      <BrowserRouter>

        <Menu style={{ textAlign:"center" }} selectedKeys={[route]} mode="horizontal">
          <Menu.Item key="/">
            <Link onClick={()=>{setRoute("/")}} to="/">MultiSig</Link>
          </Menu.Item>
          <Menu.Item key="/owners">
            <Link onClick={()=>{setRoute("/owners")}} to="/owners">Owners</Link>
          </Menu.Item>
          <Menu.Item key="/create">
            <Link onClick={()=>{setRoute("/create")}} to="/create">Create</Link>
          </Menu.Item>
          <Menu.Item key="/pool">
            <Link onClick={()=>{setRoute("/pool")}} to="/pool">Pool</Link>
          </Menu.Item>
          <Menu.Item key="/debug">
            <Link onClick={()=>{setRoute("/debug")}} to="/debug">Debug</Link>
          </Menu.Item>
        </Menu>

        <Switch>
          <Route exact path="/">
            <FrontPage
              executeTransactionEvents={executeTransactionEvents}
              contractName={contractName}
              localProvider={localProvider}
              readContracts={readContracts}
              price={price}
              mainnetProvider={mainnetProvider}
              blockExplorer={blockExplorer}
            />

            <div style={{width:500, padding:10, margin: "auto"}}> 
             <WCcomponent
             style={{width:"35%"}}
            ensProvider={mainnetProvider}
            placeholder={"Wallet Connect Scan"}
            value={walletConnectUrl}
            disabled={connected}            
            style={{backgroundColor:targetNetwork.color,borderColor:targetNetwork.color}}          
            onChange={(setToWC)=>{
              setWalletConnectUrl(setToWC)
            }}
            walletConnect={(wcLink)=>{
              setWalletConnectUrl(wcLink) }}
          >{connected?<span onClick={()=>{setConnected(false);wallectConnectConnector.killSession()}}>X</span>:""}     
          </WCcomponent>

        <Input
          
          placeholder={"Scan QR code or paste Wallet Connect code here"}
          value={walletConnectUrl}
          disabled={connected}
          onChange={(e)=>{
            setWalletConnectUrl(setToWC)
          }}
        />{connected?<span onClick={()=>{setConnected(false);wallectConnectConnector.killSession()}}>X</span>:""}
        </div>
          
          </Route>
            { /* uncomment for a second contract:
            <Contract
              name="SecondContract"
              signer={userProvider.getSigner()}
              provider={localProvider}
              address={address}
              blockExplorer={blockExplorer}
            />
            */ }

            { /* Uncomment to display and interact with an external contract (DAI on mainnet):
            <Contract
              name="DAI"
              customContract={mainnetDAIContract}
              signer={userProvider.getSigner()}
              provider={mainnetProvider}
              address={address}
              blockExplorer={blockExplorer}
            />
            */ }
          <Route exact path="/owners">
            <Owners
              contractName={contractName}
              address={address}
              userProvider={userProvider}
              mainnetProvider={mainnetProvider}
              localProvider={localProvider}
              yourLocalBalance={yourLocalBalance}
              price={price}
              tx={tx}
              writeContracts={writeContracts}
              readContracts={readContracts}
              blockExplorer={blockExplorer}
              nonce={nonce}
              ownerEvents={ownerEvents}
              signaturesRequired={signaturesRequired}
            />
          </Route>
          <Route path="/create">
            <CreateTransaction
              //poolServerUrl={poolServerUrl}
              contractName={contractName}
              address={address}
              userProvider={userProvider}
              gun={gun}
              mainnetProvider={mainnetProvider}
              localProvider={localProvider}
              yourLocalBalance={yourLocalBalance}
              price={price}
              tx={tx}
              writeContracts={writeContracts}
              readContracts={readContracts}
              setRoute={setRoute}
            />
          </Route>
          <Route path="/pool">
            <Transactions
              //poolServerUrl={poolServerUrl}
              contractName={contractName}
              address={address}
              userProvider={userProvider}
              gun={gun}
              mainnetProvider={mainnetProvider}
              localProvider={localProvider}
              yourLocalBalance={yourLocalBalance}
              price={price}
              tx={tx}
              writeContracts={writeContracts}
              readContracts={readContracts}
              blockExplorer={blockExplorer}
              nonce={nonce}
              signaturesRequired={signaturesRequired}
            />
          </Route>
          <Route path="/debug">
            <Contract
              name="MetaMultiSigWallet"
              signer={userProvider.getSigner()}
              provider={localProvider}
              address={address}
              blockExplorer={blockExplorer}
              purpose={purpose}
              setPurposeEvents={setPurposeEvents}
            />
          </Route>
          <Route path="/mainnetdai">
            <Contract
              name="DAI"
              customContract={mainnetDAIContract}
              signer={userProvider.getSigner()}
              provider={mainnetProvider}
              address={address}
              blockExplorer={"https://etherscan.io/"}
            />
          </Route>
          <Route path="/subgraph">
            <Subgraph
            subgraphUri={props.subgraphUri}
            tx={tx}
            writeContracts={writeContracts}
            mainnetProvider={mainnetProvider}
            />
          </Route>
        </Switch>
      </BrowserRouter>

      <ThemeSwitch />


      {/* 👨‍💼 Your account is in the top right with a wallet at connect options */}
      <div style={{ position: "fixed", textAlign: "right", right: 0, top: 0, padding: 10 }}>
         <Account
           address={address}
           localProvider={localProvider}
           userProvider={userProvider}
           mainnetProvider={mainnetProvider}
           price={price}
           web3Modal={web3Modal}
           loadWeb3Modal={loadWeb3Modal}
           logoutOfWeb3Modal={logoutOfWeb3Modal}
           blockExplorer={blockExplorer}
         />
         {faucetHint}
      </div>

      {/* 🗺 Extra UI like gas price, eth price, faucet, and support: */}
       <div style={{ position: "fixed", textAlign: "left", left: 0, bottom: 20, padding: 10 }}>
         <Row align="middle" gutter={[4, 4]}>
           <Col span={8}>
             <Ramp price={price} address={address} networks={NETWORKS}/>
           </Col>

           <Col span={8} style={{ textAlign: "center", opacity: 0.8 }}>
             <GasGauge gasPrice={gasPrice} />
           </Col>
           <Col span={8} style={{ textAlign: "center", opacity: 1 }}>
             <Button
               onClick={() => {
                 window.open("https://t.me/joinchat/KByvmRe5wkR-8F_zz6AjpA");
               }}
               size="large"
               shape="round"
             >
               <span style={{ marginRight: 8 }} role="img" aria-label="support">
                 💬
               </span>
               Support
             </Button>
           </Col>
         </Row>

         <Row align="middle" gutter={[4, 4]}>
           <Col span={24}>
             {

               /*  if the local provider has a signer, let's show the faucet:  */
               faucetAvailable ? (
                 <Faucet localProvider={localProvider} price={price} ensProvider={mainnetProvider}/>
               ) : (
                 ""
               )
             }
           </Col>
         </Row>
       </div>

    </div>
  );
}


/*
  Web3 modal helps us "connect" external wallets:
*/
const web3Modal = new Web3Modal({
  // network: "mainnet", // optional
  cacheProvider: true, // optional
  providerOptions: {
    walletconnect: {
      package: WalletConnectProvider, // required
      options: {
        infuraId: INFURA_ID,
      },
    },
  },
});

const logoutOfWeb3Modal = async () => {
  await web3Modal.clearCachedProvider();
  setTimeout(() => {
    window.location.reload();
  }, 1);
};

 window.ethereum && window.ethereum.on('chainChanged', chainId => {
  web3Modal.cachedProvider &&
  setTimeout(() => {
    window.location.reload();
  }, 1);
})

 window.ethereum && window.ethereum.on('accountsChanged', accounts => {
  web3Modal.cachedProvider &&
  setTimeout(() => {
    window.location.reload();
  }, 1);
})

export default App;
