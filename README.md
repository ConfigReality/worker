# Cloudflare tunnel

## Prerequisites

- [Cloudflare account](https://dash.cloudflare.com/sign-up)
- [Cloudflare lightweight server-side daemon](https://developers.cloudflare.com/cloudflare-one/connections/connect-networks/downloads/)

## Installation

1. Install the Cloudflare lightweight server-side daemon on your server. You can find the installation instructions [here](https://developers.cloudflare.com/cloudflare-one/connections/connect-networks/installation).

> For macos users, you can install the daemon using brew:

```bash
brew install cloudflared
```

2. Create a new tunnel using the following command:

```bash
cloudflared tunnel create <tunnel_name>
```

3. Start the tunnel using the following command:

```bash
cloudflared tunnel run <tunnel_name>
```

4. You can now access your server using the tunnel URL.

## Configuration

You can configure the tunnel using the `config.yml` file. You can find the configuration options [here](https://developers.cloudflare.com/cloudflare-one/connections/connect-networks/configuration).

You can configure the environment variables using the `.env` file.

You can change the environment variables such as `HOST` and `PORT` in the `.env` file.