import { Prisma } from "@prisma/client";

export type MessageWithSender = Prisma.MessageGetPayload<{
  include: {
    sender: {
      select: {
        id: true;
        username: true;
        firstName: true;
        lastName: true;
        pictureUrl: true;
      };
    };
    replyTo: {
      include: {
        sender: {
          select: {
            id: true;
            username: true;
            firstName: true;
            lastName: true;
            pictureUrl: true;
          };
        };
      };
    };
  };
}>;