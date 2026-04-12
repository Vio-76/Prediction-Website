import NextAuth from "next-auth";
import Discord from "next-auth/providers/discord";
import { PrismaAdapter } from "@auth/prisma-adapter";
import { prisma } from "@/lib/prisma";

export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: PrismaAdapter(prisma),
  providers: [
    Discord({
      clientId: process.env.AUTH_DISCORD_ID!,
      clientSecret: process.env.AUTH_DISCORD_SECRET!,
      authorization: {
        params: { scope: "identify" }, // no email scope
      },
      profile(profile) {
        const avatarUrl = profile.avatar
          ? `https://cdn.discordapp.com/avatars/${profile.id}/${profile.avatar}.png?size=128`
          : `https://cdn.discordapp.com/embed/avatars/${Number(profile.discriminator ?? 0) % 5}.png`;
        return {
          id: profile.id,
          name: profile.username,
          email: null,
          image: avatarUrl,
          discordId: profile.id,
        };
      },
    }),
  ],
  callbacks: {
    session({ session, user }) {
      session.user.id = user.id;
      // @ts-expect-error discordId is a custom field
      session.user.discordId = user.discordId as string | null;
      return session;
    },
  },
});
