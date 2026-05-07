import { Notification, NotificationType } from "@/lib/models/Notificaiton";
import { notificationEmitter } from "@/lib/inviteEmitter";

type CreateNotificationParams = {
  userId: string;
  type: NotificationType;
  title: string;
  message: string;
  link?: string;
};

export async function createNotification(params: CreateNotificationParams) {
  const notification = await Notification.create(params);

  notificationEmitter.emit(`notification:${params.userId}`, {
    _id:       notification._id.toString(),
    type:      notification.type,
    title:     notification.title,
    message:   notification.message,
    isRead:    notification.isRead,
    link:      notification.link,
    createdAt: notification.createdAt,
  });

  return notification;
}
