import React, { useCallback, useEffect, useState } from "react";
import { Button, List, Divider, Input, Card, DatePicker, Slider, Switch, Progress, Spin } from "antd";
import { SyncOutlined } from "@ant-design/icons";
import { parseEther, formatEther } from "@ethersproject/units";
import { ethers } from "ethers";
import { Address, AddressInput, Balance, Blockie, TransactionListItem } from "../components";
import { useContractReader, useEventListener, usePoller } from "eth-hooks";

const axios = require("axios");

const DEBUG = false;

export default function Transactions({
  poolServerUrl,
  contractName,
  signaturesRequired,
  address,
  nonce,
  userProvider,
  gun,
  mainnetProvider,
  localProvider,
  yourLocalBalance,
  price,
  tx,
  readContracts,
  writeContracts,
  blockExplorer,
}) {
  const [transactions, setTransactions] = useState();
  const contractAddress = readContracts && readContracts[contractName] ? readContracts[contractName].address : "";
  const totalTransactions = [];
  let txs;
  if(readContracts && readContracts[contractName] && localProvider && localProvider._network && localProvider._network.chainId){
    txs = gun.get(contractAddress+"_"+(localProvider && localProvider._network && localProvider._network.chainId));
    txs.map().once(async (transaction) => {
      totalTransactions.push(transaction);
    })
    console.log("gundb txs",totalTransactions)
  }
  
  //if using yarn backend uncomment this poller, and comment in the one below
  usePoller(() => {
    const getTransactions = async () => {
      if (true) console.log("🛰 Requesting Transaction List");
      //comment in below if using yarn backend
      /*const res = await axios.get(
        poolServerUrl + readContracts[contractName].address + "_" + localProvider._network.chainId,
      );*/
      const newTransactions = [];
      
      for (const i in totalTransactions) {
        // console.log("look through signatures of ",totalTransactions[i])
        const thisNonce = ethers.BigNumber.from(totalTransactions[i].nonce);
        if (thisNonce && nonce && thisNonce.gte(nonce)) {
          const validSignatures = [];
          const signatures = totalTransactions[i].signatures.split(",");
          for (const s in signatures) {
            // console.log("RECOVER:",signatures[s],totalTransactions[i].hash)
            const signer = await readContracts[contractName].recover(totalTransactions[i].hash, signatures[s]);
            const isOwner = await readContracts[contractName].isOwner(signer);
            if (signer && isOwner) {
              validSignatures.push({ signer, signature: signatures[s] });
            }
          }
          //uncomment 66 and comment 67 if using yarn backend
          //const update = { ...res.data[i], validSignatures };
          const update = { ...totalTransactions[i], validSignatures };
          // console.log("update",update)
          newTransactions.push(update);
        }
      }
      setTransactions(newTransactions);
      console.log("Loaded",newTransactions.length)
    };
    if (readContracts) getTransactions();
  }, 3777);

  const getSortedSigList = async (allSigs, newHash) => {
    console.log("allSigs", allSigs);

    const sigList = [];
    for (const s in allSigs) {
      console.log("SIG", allSigs[s]);
      const recover = await readContracts[contractName].recover(newHash, allSigs[s]);
      sigList.push({ signature: allSigs[s], signer: recover });
    }

    sigList.sort((a, b) => {
      return ethers.BigNumber.from(a.signer).sub(ethers.BigNumber.from(b.signer));
    });

    console.log("SORTED SIG LIST:", sigList);

    const finalSigList = [];
    const finalSigners = [];
    const used = {};
    for (const s in sigList) {
      if (!used[sigList[s].signature]) {
        finalSigList.push(sigList[s].signature);
        finalSigners.push(sigList[s].signer);
      }
      used[sigList[s].signature] = true;
    }

    console.log("FINAL SIG LIST:", finalSigList);
    return [finalSigList, finalSigners];
  };

  if (!signaturesRequired) {
    return <Spin />;
  }

  console.log("transactions",transactions)

  return (
    <div style={{ maxWidth: 750, margin: "auto", marginTop: 32, marginBottom: 32 }}>
      <h1>
        <b style={{ padding: 16 }}>#{nonce ? nonce.toNumber() : <Spin />}</b>
      </h1>

      <List
        bordered
        dataSource={transactions}
        renderItem={item => {
          console.log("ITE88888M", item);

          const hasSigned = item.signers.indexOf(address) >= 0;
          const hasEnoughSignatures = item.signatures.length <= signaturesRequired.toNumber();

          return (
            <TransactionListItem item={item} mainnetProvider={mainnetProvider} blockExplorer={blockExplorer} price={price} readContracts={readContracts} contractName={contractName}>
              <span>
                {item.signatures.split(",").length}/{signaturesRequired.toNumber()} {hasSigned ? "✅" : ""}
              </span>
              <Button
                onClick={async () => {
                  console.log("item.signatures", item.signatures.split(","));

                  const newHash = await readContracts[contractName].getTransactionHash(
                    item.nonce,
                    item.to,
                    parseEther("" + parseFloat(item.amount).toFixed(12)),
                    item.data,
                  );
                  console.log("newHash", newHash);
                  let userSigner = userProvider.getSigner();
                  const signature = await userSigner.signMessage(ethers.utils.arrayify(newHash));;
                  console.log("signature", signature);

                  const recover = await readContracts[contractName].recover(newHash, signature);
                  console.log("recover--->", recover);

                  const isOwner = await readContracts[contractName].isOwner(recover);
                  console.log("isOwner", isOwner);

                  if (isOwner) {
                    const [finalSigList, finalSigners] = await getSortedSigList(
                      [...item.signatures.split(","), signature],
                      newHash,
                    );
                    const joinedSigList = finalSigList.join()
                    const joinedFinalSigners = finalSigners.join()
                    const {validSignatures, ...simpleItem} = item
                    //we remove this array that was previously added to the object, just to deal with GunDB, as it is not necessary. There are probably better ways of doing this...
                    const newItem = {
                      ...simpleItem,
                      signatures: joinedSigList,
                      signers: joinedFinalSigners,
                    }
                    const newSigTx = gun.get(newItem.hash+"newSig").put(newItem)
                    txs.set(newSigTx)
                    
                  }
                }}
                type="secondary"
              >
                Sign
              </Button>
              <Button

                key={item.hash}
                
                onClick={async () => {
                  const newHash = await readContracts[contractName].getTransactionHash(
                    item.nonce,
                    item.to,
                    parseEther("" + parseFloat(item.amount).toFixed(12)),
                    item.data,
                  );
                  console.log("newHash", newHash);

                  console.log("item.signatures", item.signatures.split(","));

                  const [finalSigList, finalSigners] = await getSortedSigList(item.signatures.split(","), newHash);

                  tx(
                    writeContracts[contractName].executeTransaction(
                      item.to,
                      parseEther("" + parseFloat(item.amount).toFixed(12)),
                      item.data,
                      finalSigList,
                    ),
                  );
                }}
                type={hasEnoughSignatures ? "primary" : "secondary"}
              >
                Exec
              </Button>
          </TransactionListItem>
          );
        }}
      />
    </div>
  );
}

//comment below and uncomment above if using yarn!!

/*usePoller(() => {
    const getTransactions = async () => {
      if (true) console.log("🛰 Requesting Transaction List");
      const res = await axios.get(
        poolServerUrl + readContracts[contractName].address + "_" + localProvider._network.chainId,
      );
      const newTransactions = [];
      for (const i in res.data) {
        // console.log("look through signatures of ",res.data[i])
        const thisNonce = ethers.BigNumber.from(res.data[i].nonce);
        if (thisNonce && nonce && thisNonce.gte(nonce)) {
          const validSignatures = [];
          for (const s in res.data[i].signatures) {
            // console.log("RECOVER:",res.data[i].signatures[s],res.data[i].hash)
            const signer = await readContracts[contractName].recover(res.data[i].hash, res.data[i].signatures[s]);
            const isOwner = await readContracts[contractName].isOwner(signer);
            if (signer && isOwner) {
              validSignatures.push({ signer, signature: res.data[i].signatures[s] });
            }
          }
          const update = { ...res.data[i], validSignatures };
          // console.log("update",update)
          newTransactions.push(update);
        }
	@@ -113,11 +124,11 @@ export default function Transactions({
          return (
            <TransactionListItem item={item} mainnetProvider={mainnetProvider} blockExplorer={blockExplorer} price={price} readContracts={readContracts} contractName={contractName}>
              <span>
                {item.signatures.length}/{signaturesRequired.toNumber()} {hasSigned ? "✅" : ""}
              </span>
              <Button
                onClick={async () => {
                  console.log("item.signatures", item.signatures);

                  const newHash = await readContracts[contractName].getTransactionHash(
                    item.nonce,
	@@ -126,8 +137,8 @@ export default function Transactions({
                    item.data,
                  );
                  console.log("newHash", newHash);

                  const signature = await userProvider.send("personal_sign", [newHash, address]);
                  console.log("signature", signature);

                  const recover = await readContracts[contractName].recover(newHash, signature);
	@@ -138,17 +149,22 @@ export default function Transactions({

                  if (isOwner) {
                    const [finalSigList, finalSigners] = await getSortedSigList(
                      [...item.signatures, signature],
                      newHash,
                    );
                    const res = await axios.post(poolServerUrl, {
                      ...item,
                      signatures: finalSigList,
                      signers: finalSigners,
                    });
                  }

                  // tx( writeContracts[contractName].executeTransaction(item.to,parseEther(""+parseFloat(item.amount).toFixed(12)), item.data, item.signatures))
                }}
                type="secondary"
              >
	@@ -167,9 +183,9 @@ export default function Transactions({
                  );
                  console.log("newHash", newHash);

                  console.log("item.signatures", item.signatures);

                  const [finalSigList, finalSigners] = await getSortedSigList(item.signatures, newHash);

                  tx(
                    writeContracts[contractName].executeTransaction(
	@@ -190,4 +206,4 @@ export default function Transactions({
      />
    </div>
  );
} */