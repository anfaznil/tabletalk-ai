import { TEST_ACCOUNT_USERNAME } from "@/lib/auth/constants";

export function verifyCredentials(
  username: string,
  password: string
): boolean {
  const expectedUsername =
    process.env.AUTH_USERNAME ?? TEST_ACCOUNT_USERNAME;
  const expectedPassword = process.env.AUTH_PASSWORD ?? "F@nzy123";

  return username === expectedUsername && password === expectedPassword;
}
