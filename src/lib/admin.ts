export function isAdmin(discordId: string | null | undefined): boolean {
  return (
    !!discordId &&
    !!process.env.ADMIN_DISCORD_ID &&
    discordId === process.env.ADMIN_DISCORD_ID
  );
}
