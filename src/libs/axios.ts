import axios, { AxiosRequestConfig, AxiosResponse } from 'axios';
import { AxiosInterface } from '@type';

const getMethodArray: Array<string> = ['GET', 'get'];
export const Axios = async ({
  url,
  data,
  params,
  headers,
  method = 'get',
  responseType,
}: AxiosInterface): Promise<AxiosResponse> => {
  try {
    {
      const API_CONFIG: AxiosRequestConfig = {
        url,
        method,
        data,
        headers,
        responseType,
      };
      if (!getMethodArray.includes(method) && data) API_CONFIG.data = data;
      if (params) API_CONFIG.params = params;
      return await axios(API_CONFIG);
    }
  } catch (error: any) {
    const errorText = `Request for ${url} is failed with status code ${error.response.status} 
      and data ${JSON.stringify(error.response.data)}`;
    throw new Error(errorText);
  }
};
