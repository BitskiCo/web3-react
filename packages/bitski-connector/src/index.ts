import { ConnectorUpdate } from '@web3-react/types'
import { AbstractConnector } from '@web3-react/abstract-connector'

const chainIdToNetwork: { [network: number]: string } = {
  1: 'mainnet',
  4: 'rinkeby',
  42: 'kovan'
}

const supportedChainIds = [1, 4, 42];

interface BitskiConnectorArguments {
  apiKey: string
  callbackUrl: string
}

export class BitskiConnector extends AbstractConnector {
  private readonly apiKey: string
  private readonly callbackUrl: string
  private currentChainId: number

  public bitski: any

  constructor({ apiKey, callbackUrl }: BitskiConnectorArguments) {
    super({ supportedChainIds })

    this.apiKey = apiKey
    this.callbackUrl = callbackUrl
    this.currentChainId = 1;
  }

  public async activate(): Promise<ConnectorUpdate> {
    if (!this.bitski) {
      const { Bitski } = await import('bitski');
      this.bitski = new Bitski(
        this.apiKey,
        this.callbackUrl,
      );
    }

    await this.bitski.signIn();

    const account = await this.getAccount();

    return { provider: this.bitski.getProvider(), chainId: this.currentChainId, account };
  }

  public async getProvider(): Promise<any> {
    return this.bitski.getProvider(chainIdToNetwork[this.currentChainId]);
  }

  public async getChainId(): Promise<number | string> {
    return this.currentChainId;
  }

  public async getAccount(): Promise<null | string> {
    return this.bitski
      .getProvider()
      .send('eth_accounts', [])
      .then((accounts: string[]): string => accounts[0]);
  }

  public deactivate() {}

  public async close() {
    await this.bitski.logout();
    this.emitDeactivate();
  }
}
