import { Dispatch } from "react";
import { AnyAction } from "redux";
import axios from "axios";

export class crucibleApi {
  jwtToken = "";
  address = ""

  async signInToServer(userAddress: string) {
    const res = await axios.post('http://localhost:8080', {
      command: "signInUsingAddress",
      data: { userAddress },
      params: [],
    });
    const { unsecureSession } = res.data;
    this.address = userAddress;
    this.jwtToken = unsecureSession;
    return unsecureSession;
  }

  gatewayApi(data: any) {
    return axios.post('http://localhost:8080', data, {
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Content-type": "Application/json",
        Authorization: `Bearer ${this.jwtToken}`,
      },
    });
  }
}

