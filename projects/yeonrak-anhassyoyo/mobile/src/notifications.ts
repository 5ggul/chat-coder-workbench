import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: false,
    shouldSetBadge: false
  })
});

async function ensurePermission() {
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('sealed', {
      name: '봉인 메시지',
      importance: Notifications.AndroidImportance.DEFAULT,
      vibrationPattern: [0, 180],
      sound: null
    });
    await Notifications.setNotificationChannelAsync('evening', {
      name: '저녁 기록',
      importance: Notifications.AndroidImportance.LOW,
      sound: null
    });
  }
  const current = await Notifications.getPermissionsAsync();
  if (current.granted) return true;
  const asked = await Notifications.requestPermissionsAsync();
  return asked.granted;
}

export async function scheduleSealNotification(unlockAt: string) {
  if (!(await ensurePermission())) return undefined;
  const date = new Date(unlockAt);
  if (date.getTime() <= Date.now()) return undefined;
  return Notifications.scheduleNotificationAsync({
    content: {
      title: '봉인 시간이 끝났어요',
      body: '그때 쓰고 싶었던 말을 지금 다시 확인해 보세요.',
      data: { route: 'vault' }
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.DATE,
      date,
      channelId: Platform.OS === 'android' ? 'sealed' : undefined
    }
  });
}

export async function cancelNotification(id?: string) {
  if (!id) return;
  await Notifications.cancelScheduledNotificationAsync(id).catch(() => undefined);
}

export async function scheduleNextEveningReminder(hour: number) {
  if (!(await ensurePermission())) return undefined;
  const date = new Date();
  date.setHours(hour, 0, 0, 0);
  if (date.getTime() <= Date.now()) date.setDate(date.getDate() + 1);
  return Notifications.scheduleNotificationAsync({
    content: {
      title: '오늘은 어땠나요',
      body: '연락하고 싶었던 순간이 있었다면 기록만 남겨도 충분해요.',
      data: { route: 'home' }
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.DATE,
      date,
      channelId: Platform.OS === 'android' ? 'evening' : undefined
    }
  });
}
