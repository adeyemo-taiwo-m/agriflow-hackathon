import httpx
from src.db.redis import redis_client
from src.config import Config
import base64
from src.interswitch.payment_status import PaymentStatus
from src.utils.logger import logger
from fastapi import HTTPException, status


class InterswitchMarketplaceServices:

    async def get_marketplace_access_token(self):

        cached_token = await redis_client.get("interswitch_marketplace_access_token")

        if cached_token:
            logger.info("Returning cached Interswitch market place access token")

            print(cached_token)
            return cached_token

        logger.info("Token missing or expired. Generating new token from Interswitch...")

        
        authorization = base64.b64encode((f"{Config.INTERSWITCH_MARKETPLACE_CLIENT_ID}:{Config.INTERSWITCH_MARKETPLACE_SECRET_KEY}").encode()).decode()

        headers = {
            "accept": "application/json",
            "Authorization": f"Basic {authorization}",
            "Content-Type": "application/x-www-form-urlencoded"
        }

        async with httpx.AsyncClient(timeout=30) as client:

            try:
                response = await client.post(Config.INTERSWITCH_MARKETPLACE_TOKEN_URL, headers=headers, data={"grant_type": "client_credentials"})

                response.raise_for_status()
                token_info = response.json()

            except httpx.HTTPError as e:
                logger.error(f"Failed to get token from Interswitch: {str(e)}")

                raise HTTPException(
                    status_code=status.HTTP_502_BAD_GATEWAY,
                    detail="Gateway unavailabe"
                )

            # Subtract 300s buffer to avoid token expiring mid-request.
            # max(..., 60) guards against very short-lived tokens.
            safe_ttl = max(int(token_info["expires_in"]) - 300, 60)

            await redis_client.setex("interswitch_marketplace_access_token", safe_ttl, token_info["access_token"])

            logger.info(f"New Interswitch market place access token cached | expires_in: {token_info['expires_in']}s | safe_ttl: {safe_ttl}s")

            return token_info["access_token"]
        
    async def get_bvn(self, bvn: str = 11111111111):
        access_token = await self.get_marketplace_access_token()

        headers= {
            "Content-Type": "application/json",
            "Authorization": f"Bearer {access_token}"
        }

        payload = {
            "id": bvn
        }

        async with httpx.AsyncClient(timeout=30) as client:
            
            try:
                response = await client.post(
                    url =f"{Config.INTERSWITCH_MARKETPLACE_BASE_URL}/verify/identity/bvn/verify", headers=headers,
                    json=payload)
            except httpx.HTTPError as e:
                logger.error(f"Failed to get get bvn info: {str(e)}", exc_info=True)

                raise HTTPException(
                    status_code=status.HTTP_502_BAD_GATEWAY,
                    detail="Gateway unavailabe"
                )
            
            result = response.json()

            data = result.get("data", {})

            if data.get("status") != "found":
                return {"success": False, "code": response.status_code, "bvn_name": None, "bvn": bvn}

            first_name = data.get("firstName")
            last_name = data.get("lastName")
            middle_name = data.get("middleName")

            parts = [first_name]
            if middle_name:
                parts.append(middle_name)
            parts.append(last_name)
            bvn_name = " ".join(parts).strip()


            bvn_details = {
                "success": True,
                "code": 200,
                "bvn_name": bvn_name,
                "bvn": bvn
            }

            return bvn_details

    async def get_credit_history(self, bvn: str):
        access_token = await self.get_marketplace_access_token()

        headers= {
            "Content-Type": "application/json",
            "Authorization": f"Bearer {access_token}"
        }

        payload = {
            "bvn": bvn
        }

        async with httpx.AsyncClient(timeout=30) as client:
            
            try:
                response = await client.post(
                    url =f"{Config.INTERSWITCH_MARKETPLACE_BASE_URL}/verify/identity/credit-history-lookup", headers=headers,
                    json=payload)
            except httpx.HTTPError as e:
                logger.error(f"Failed to get credit history info: {str(e)}", exc_info=True)

                raise HTTPException(
                    status_code=status.HTTP_502_BAD_GATEWAY,
                    detail="Gateway unavailabe"
                )
            

            return response.json()

    async def get_banks_list(self):
        access_token = await self.get_marketplace_access_token()

        headers= {
            "Content-Type": "application/json",
            "Authorization": f"Bearer {access_token}"
        }


        async with httpx.AsyncClient(timeout=30) as client:
            
            try:
                response = await client.get(
                    url =f"{Config.INTERSWITCH_MARKETPLACE_BASE_URL}/verify/identity/account-number/bank-list", headers=headers)
             
            except httpx.HTTPError as e:
                logger.error(f"Failed to get bank list info: {str(e)}", exc_info=True)

                raise HTTPException(
                    status_code=status.HTTP_502_BAD_GATEWAY,
                    detail="Gateway unavailabe"
                )
            

            return response.json()
        
    async def user_account_lookup(self, account_num: str, bank_code: str):
        access_token = await self.get_marketplace_access_token()

        headers= {
            "Content-Type": "application/json",
            "Authorization": f"Bearer {access_token}"
        }

        payload = {
            "accountNumber": account_num,
            "bankCode": bank_code
        }

        async with httpx.AsyncClient(timeout=30) as client:
            
            try:
                response = await client.post(
                    url =f"{Config.INTERSWITCH_MARKETPLACE_BASE_URL}/verify/identity/account-number/resolve", headers=headers,
                    json=payload)
                
            except httpx.HTTPError as e:
                logger.error(f"Failed to get user bank account info: {str(e)}", exc_info=True)

                raise HTTPException(
                    status_code=status.HTTP_502_BAD_GATEWAY,
                    detail="Gateway unavailabe"
                )
            

            return response.json()


class InterswitchPaymentServices:

    async def get_access_token(self):

        cached_token = await redis_client.get("interswitch_access_token")

        if cached_token:
            logger.info("Returning cached Interswitch access token")
            return cached_token

        logger.info("Token missing or expired. Generating new token from Interswitch...")

        url = f"{Config.INTERSWITCH_PAYMENT_BASE_URL}/passport/oauth/token"
        authorization = base64.b64encode(
            (f"{Config.INTERSWITCH_PAYMENT_CLIENT_ID}:{Config.INTERSWITCH_PAYMENT_SECRET_KEY}").encode()
        ).decode()

        headers = {
            "accept": "application/json",
            "Authorization": f"Basic {authorization}",
            "Content-Type": "application/x-www-form-urlencoded"
        }

        async with httpx.AsyncClient(timeout=30) as client:

            try:
                response = await client.post(
                    url,
                    headers=headers,
                    data={"grant_type": "client_credentials"}
                )
                response.raise_for_status()
                token_info = response.json()

            except httpx.HTTPError as e:
                logger.error(f"Failed to get payment token from Interswitch: {str(e)}")
                raise HTTPException(
                    status_code=status.HTTP_502_BAD_GATEWAY,
                    detail="Payment gateway unavailable"
                )

            # Subtract 300s buffer to avoid token expiring mid-request.
            # max(..., 60) guards against very short-lived tokens.
            safe_ttl = max(int(token_info["expires_in"]) - 300, 60)

            await redis_client.setex(
                "interswitch_access_token",
                safe_ttl,
                token_info["access_token"]
            )

            logger.info(
                f"New Interswitch access token cached | "
                f"expires_in: {token_info['expires_in']}s | safe_ttl: {safe_ttl}s"
            )

            return token_info["access_token"]

    async def check_interswitch_transaction(self, txn_ref: str, expected_amount: int):

        access_token = await self.get_access_token()

        url = f"{Config.INTERSWITCH_PAYMENT_BASE_URL}/collections/api/v1/gettransaction.json"
        params = {
            "merchantcode": Config.INTERSWITCH_PAYMENT_MERCHANT_CODE,
            "transactionreference": txn_ref.upper(),
            "amount": expected_amount
        }

        headers = {
            "Content-Type": "application/json",
            "Authorization": f"Bearer {access_token}",
        }

        logger.info(
            f"Querying Interswitch for txn_ref: {txn_ref} | "
            f"expected_amount: {expected_amount} kobo"
        )

        async with httpx.AsyncClient(timeout=30) as client:

            try:
                response = await client.get(url=url, headers=headers, params=params)
                data = response.json()

            except httpx.HTTPError as e:
                logger.error(f"Failed to query transaction from Interswitch: {str(e)}")
                raise HTTPException(
                    status_code=status.HTTP_502_BAD_GATEWAY,
                    detail="Payment gateway unavailable"
                )

            response_code = data.get("ResponseCode")
            approved_amount = int(data.get("Amount", 0))

            # Full approval
            if response_code == "00":
                logger.info(
                    f"Interswitch confirmed txn_ref: {txn_ref} | "
                    f"approved: {approved_amount} kobo"
                )
                return {
                    "status": PaymentStatus.CONFIRMED,
                    "approved_amount": approved_amount,
                    "message": "Payment confirmed",
                    "raw": data
                }

            # Partial approval — card had insufficient balance
            elif response_code == "10":
                shortfall = expected_amount - approved_amount
                logger.warning(
                    f"Partial approval for txn_ref: {txn_ref} | "
                    f"expected: {expected_amount} kobo | approved: {approved_amount} kobo | "
                    f"shortfall: {shortfall} kobo"
                )
                return {
                    "status": PaymentStatus.PARTIAL,
                    "approved_amount": approved_amount,
                    "expected_amount": expected_amount,
                    "shortfall": shortfall,
                    "message": (
                        f"Only ₦{approved_amount / 100:,.0f} was approved "
                        f"out of ₦{expected_amount / 100:,.0f}. "
                        f"Shortfall: ₦{shortfall / 100:,.0f}"
                    ),
                    "raw": data
                }

            # Transaction still processing
            elif response_code == "09":
                logger.warning(f"Transaction still pending | txn_ref: {txn_ref}")
                return {
                    "status": PaymentStatus.PENDING,
                    "message": "Transaction is still processing. Try again in a moment.",
                    "raw": data
                }

            # Customer cancelled
            elif response_code == "Z6":
                logger.warning(f"Transaction cancelled by customer | txn_ref: {txn_ref}")
                return {
                    "status": PaymentStatus.CANCELLED,
                    "message": "Transaction was cancelled by customer.",
                    "raw": data
                }

            # Everything else is a failure
            else:
                logger.warning(
                    f"Transaction failed | txn_ref: {txn_ref} | "
                    f"code: {response_code} | desc: {data.get('ResponseDescription')}"
                )
                return {
                    "status": PaymentStatus.FAILED,
                    "message": data.get("ResponseDescription", "Payment failed"),
                    "response_code": response_code,
                    "raw": data
                }