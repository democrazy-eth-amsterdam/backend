from collections import defaultdict
from decimal import Decimal
import os

import requests


def get_rpc_response(method, params=[]):
    url = "https://kovan.optimism.io/"
    params = params or []
    data = {"jsonrpc": "2.0", "method": method, "params": params, "id": 1}
    headers = {"Content-Type": "application/json"}
    response = requests.post(url, headers=headers, json=data)
    return response.json()


def get_contract_transfers(address, decimals=18, from_block=None):
    """Get logs of Transfer events of a contract"""
    from_block = from_block or "0x0"
    transfer_hash = "0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef"
    params = [{"address": address, "fromBlock": from_block, "topics": [transfer_hash]}]
    logs = get_rpc_response("eth_getLogs", params)['result']
    # from pprint import pprint as pp
    # pp(logs[100])
    decimals_factor = Decimal("10") ** Decimal("-{}".format(decimals))
    for log in logs:
        log["amount"] = Decimal(str(int(log["data"], 16))) * decimals_factor
        log["from"] = log["topics"][1][0:2] + log["topics"][1][26:]
        log["to"] = log["topics"][2][0:2] + log["topics"][2][26:]
    return logs


def get_balances(transfers):
    balances = defaultdict(Decimal)
    for t in transfers:
        balances[t["from"]] -= t["amount"]
        balances[t["to"]] += t["amount"]
    bottom_limit = Decimal("0.00000000001")
    balances = {k: balances[k] for k in balances if balances[k] > bottom_limit}
    return balances


def get_balances_list(transfers):
    balances = get_balances(transfers)
    balances = [{"address": a, "amount": b} for a, b in balances.items()]
    balances = sorted(balances, key=lambda b: -abs(b["amount"]))
    return balances

transfers = get_contract_transfers("0x86db8fc255d46aa692dbc2050c4a26c1ce61711e")
print(get_balances_list(transfers))