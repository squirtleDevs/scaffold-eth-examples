import React, { useCallback, useEffect, useState } from "react";
import { useHistory } from "react-router-dom";
import { Select, Button, List, Divider, Input, Card, DatePicker, Slider, Switch, Progress, Spin } from "antd";
import { SyncOutlined } from '@ant-design/icons';
import { Address, AddressInput, Balance, Blockie, BytesStringInput, EtherInput } from "../components";
import { parseEther, formatEther } from "@ethersproject/units";
import { ethers } from "ethers";
import { useContractReader, useEventListener, useLocalStorage } from "../hooks";
const axios = require('axios');
const { Option } = Select;

export default function DAISWAP ({contractName, ownerEvents, signaturesRequired, address, nonce, userProvider, mainnetProvider, localProvider, yourLocalBalance, price, tx, readContracts, writeContracts, blockExplorer}) {
const history = useHistory();

const [fndetail, setfndetail] = useLocalStorage("fn");
const [swap1, setSwap1] = useLocalStorage("swap1");
const [swap2, setSwap2] = useLocalStorage("swap2");
const [toadd, setToadd] = useLocalStorage("toadd")
const [out, setout] = useLocalStorage("setout")
const [dead, setdead] = useLocalStorage("dead")
const [din, setdIn] = useLocalStorage("in");
const [meth, setMethod] = useLocalStorage("hash");
const [datas, setDatas] = useLocalStorage("data","0x");


return(
    <div style={{border:"1px solid #cccccc", padding:16, width:400, margin:"auto",marginTop:64}}>
        <div style={{margin:8,padding:8}}>
          <Select value={meth} style={{ width: "100%" }} onChange={ setMethod }>
            <Option key="hash">hash()</Option>
            
            
          </Select>
          </div>
           <div style={{margin:8,padding:8}}>
          <Input
            ensProvider={mainnetProvider}
            placeholder="function name state variables; hash(uint address[]......)"
            value={fndetail}
            onChange={(e)=>{setfndetail(e.target.value)}}
          />
        </div>
<div style={{margin:8,padding:8}}>
          <AddressInput
            autoFocus
            ensProvider={mainnetProvider}
            placeholder="address to receive"
            value={toadd}
            onChange={setToadd}
          />
          </div>
           <div style={{margin:8,padding:8}}>
          <Input
            ensProvider={mainnetProvider}
            placeholder="ether input"
            value={din}
            onChange={(e)=>{setdIn(e.target.value)}}
          />
        </div>
         <div style={{margin:8,padding:8}}>
          <Input
            ensProvider={mainnetProvider}
            placeholder="min dai out"
            value={out}
            onChange={(e)=>{setout(e.target.value)}}
          />
        </div>
         <div style={{margin:8,padding:8}}>
          <Input
            ensProvider={mainnetProvider}
            placeholder="deadline"
            value={dead}
            onChange={(e)=>{setdead(e.target.value)}}
          />
        </div>
         <div style={{margin:8,padding:8}}>
          <Input
            ensProvider={mainnetProvider}
            placeholder="address of first swap as string"
            value={swap1}
            onChange={(e)=>{setSwap1(e.target.value)}}
          />
        </div>
          <div style={{margin:8,padding:8}}>
          <Input
            ensProvider={mainnetProvider}
            placeholder="address of first swap as string"
            value={swap2}
            onChange={(e)=>{setSwap2(e.target.value)}}
          />
        </div>
                <div style={{margin:8,padding:8}}>
          <Button onClick={()=>{
            console.log("METHOD",setMethod)
            let calldata = readContracts[contractName].interface.encodeFunctionData(fndetail, din, out, swap1,swap2,toadd, dead)
            console.log("calldata",calldata)
            setDatas(calldata)
            setout("0")
            setdIn("0")
            setSwap1(readContracts[contractName].address)
            setTimeout(()=>{
              history.push('/create')
            },777)
          }}>
          Create Tx
          </Button>
        </div>
      </div>
    


);

}



