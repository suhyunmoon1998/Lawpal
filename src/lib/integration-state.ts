import { SignJWT, jwtVerify } from "jose";

type IntegrationState = {
  lawFirmId: string;
  userId: string;
  provider: "GMAIL";
};

function getStateSecret() {
  const secret = process.env.JWT_SECRET ?? "development-secret-change-me";
  return new TextEncoder().encode(`${secret}:integration-state`);
}

export async function signIntegrationState(state: IntegrationState) {
  return new SignJWT(state)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("15m")
    .sign(getStateSecret());
}

export async function verifyIntegrationState(token: string) {
  const verified = await jwtVerify(token, getStateSecret());
  return verified.payload as IntegrationState;
}
