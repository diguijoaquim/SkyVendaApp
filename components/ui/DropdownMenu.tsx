import React, { ReactNode, useCallback, useRef, useState } from 'react';
import { Dimensions, Modal, Pressable, StyleSheet, View, Text } from 'react-native';

type DropdownMenuItem = {
  key: string;
  label: string;
  icon?: ReactNode;
  destructive?: boolean;
  onPress?: () => void;
};

type DropdownMenuProps = {
  children: ReactNode; // trigger
  items: DropdownMenuItem[];
  align?: 'start' | 'end' | 'center';
};

export default function DropdownMenu({ children, items, align = 'end' }: DropdownMenuProps) {
  const [open, setOpen] = useState(false);
  const triggerRef = useRef<View | null>(null);
  const [position, setPosition] = useState<{ top: number; left: number }>({ top: 0, left: 0 });
  const [menuWidth, setMenuWidth] = useState<number>(220);

  const openMenu = useCallback(() => {
    if (triggerRef.current) {
      try {
        (triggerRef.current as any).measureInWindow((x: number, y: number, w: number, h: number) => {
          const { width: screenW, height: screenH } = Dimensions.get('window');
          let left = x;
          // Align end to the right edge of trigger if requested
          if (align === 'end') left = Math.max(8, Math.min(x + w - menuWidth, screenW - menuWidth - 8));
          if (align === 'center') left = Math.max(8, Math.min(x + (w / 2) - (menuWidth / 2), screenW - menuWidth - 8));
          if (align === 'start') left = Math.max(8, Math.min(x, screenW - menuWidth - 8));

          // Place menu below the trigger; if close to bottom, place above
          const defaultTop = y + h + 6;
          const estimatedHeight = 8 + items.length * 44; // padding + items
          let top = defaultTop;
          if (defaultTop + estimatedHeight > screenH - 8) {
            top = Math.max(8, y - estimatedHeight - 6);
          }

          setPosition({ top, left });
          setOpen(true);
        });
      } catch {
        setOpen(true);
      }
    } else {
      setOpen(true);
    }
  }, []);

  const closeMenu = useCallback(() => setOpen(false), []);

  const onItemPress = useCallback((handler?: () => void) => {
    closeMenu();
    requestAnimationFrame(() => handler?.());
  }, [closeMenu]);

  return (
    <>
      <Pressable ref={triggerRef as any} onPress={openMenu} hitSlop={8}>
        {children}
      </Pressable>

      <Modal visible={open} transparent animationType="fade" onRequestClose={closeMenu}>
        <Pressable style={styles.backdrop} onPress={closeMenu}>
          <View />
        </Pressable>
        <View style={[styles.absoluteFill]} pointerEvents="box-none">
          <View
            onLayout={(e) => setMenuWidth(Math.max(200, e.nativeEvent.layout.width))}
            style={[
              styles.menu,
              { position: 'absolute', top: position.top, left: position.left },
            ]}
          >
            {items.map((it, idx) => (
              <Pressable
                key={it.key}
                onPress={() => onItemPress(it.onPress)}
                android_ripple={{ color: 'rgba(0,0,0,0.08)' }}
                style={({ pressed }) => [styles.item, pressed && styles.itemPressed]}
              >
                {it.icon ? <View style={{ marginRight: 8 }}>{it.icon}</View> : null}
                <Text style={[styles.label, it.destructive ? styles.destructive : undefined]}>{it.label}</Text>
              </Pressable>
            ))}
          </View>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'transparent'
  },
  sheetWrap: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  absoluteFill: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  menu: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    paddingVertical: 6,
    paddingHorizontal: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 16,
    elevation: 6,
    minWidth: 200,
  },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 10,
    borderRadius: 8,
  },
  itemPressed: {
    backgroundColor: '#F3F4F6',
  },
  label: {
    fontSize: 14,
    color: '#111827',
    fontWeight: '600',
  },
  destructive: {
    color: '#DC2626',
  },
});


