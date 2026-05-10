-- DropForeignKey
ALTER TABLE "conversations" DROP CONSTRAINT "conversations_last_message_id_fkey";

-- DropForeignKey
ALTER TABLE "conversation_members" DROP CONSTRAINT "conversation_members_conversation_id_fkey";

-- DropForeignKey
ALTER TABLE "messages" DROP CONSTRAINT "messages_conversation_id_fkey";

-- DropForeignKey
ALTER TABLE "messages" DROP CONSTRAINT "messages_reply_to_id_fkey";

-- DropTable
DROP TABLE "conversation_members";

-- DropTable
DROP TABLE "conversations";

-- DropTable
DROP TABLE "messages";

-- DropEnum
DROP TYPE "ConversationType";

-- DropEnum
DROP TYPE "MessageType";
