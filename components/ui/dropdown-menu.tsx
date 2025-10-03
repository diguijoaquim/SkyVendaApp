import React, { createContext, forwardRef, ReactNode, useCallback, useContext, useMemo, useRef, useState } from 'react';
import { Dimensions, Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

type DropdownContextType = {
  open: boolean;
  setOpen: (v: boolean) => void;
  setAnchor: (anchor: { x: number; y: number; w: number; h: number }) => void;
  anchor: { x: number; y: number; w: number; h: number } | null;
};

const DropdownContext = createContext<DropdownContextType | null>(null);

export function DropdownMenu({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const [anchor, setAnchor] = useState<DropdownContextType['anchor']>(null);
  const value = useMemo(() => ({ open, setOpen, anchor, setAnchor }), [open, anchor]);
  return (
    <DropdownContext.Provider value={value}>{children}</DropdownContext.Provider>
  );
}

export function useDropdownMenu() {
  const ctx = useContext(DropdownContext);
  if (!ctx) throw new Error('DropdownMenu components must be used within <DropdownMenu>');
  return ctx;
}

export const DropdownMenuTrigger = forwardRef<View, { asChild?: boolean; children: ReactNode }>(
  function Trigger({ children }, ref) {
    const { setOpen, setAnchor } = useDropdownMenu();
    const localRef = useRef<View | null>(null);
    const assignRef = (node: any) => {
      localRef.current = node;
      // @ts-ignore
      if (typeof ref === 'function') ref(node);
      // @ts-ignore
      else if (ref && 'current' in (ref as any)) (ref as any).current = node;
    };

    const onPress = useCallback(() => {
      if (localRef.current && (localRef.current as any).measureInWindow) {
        (localRef.current as any).measureInWindow((x: number, y: number, w: number, h: number) => {
          setAnchor({ x, y, w, h });
          setOpen(true);
        });
      } else {
        setOpen(true);
      }
    }, [setOpen, setAnchor]);

    return (
      <Pressable ref={assignRef} onPress={onPress} hitSlop={8}>
        {children}
      </Pressable>
    );
  }
);

export function DropdownMenuContent({ children, className, align = 'end', maxItems = 6, itemHeight = 60 }: { children: ReactNode; className?: string; align?: 'start' | 'center' | 'end'; maxItems?: number; itemHeight?: number }) {
  const { open, setOpen, anchor } = useDropdownMenu();
  const [menuWidth, setMenuWidth] = useState(220);

  const position = useMemo(() => {
    const { width: screenW, height: screenH } = Dimensions.get('window');
    if (!anchor) return { top: 0, left: 0 };
    let left = anchor.x;
    if (align === 'end') left = Math.max(8, Math.min(anchor.x + anchor.w - menuWidth, screenW - menuWidth - 8));
    if (align === 'center') left = Math.max(8, Math.min(anchor.x + (anchor.w / 2) - (menuWidth / 2), screenW - menuWidth - 8));
    if (align === 'start') left = Math.max(8, Math.min(anchor.x, screenW - menuWidth - 8));

    const defaultTop = anchor.y + anchor.h + 6;
    const itemsCount = React.Children.count(children);
    const visibleItems = Math.min(itemsCount, maxItems);
    const estimatedHeight = 8 + visibleItems * itemHeight;
    let top = defaultTop;
    if (defaultTop + estimatedHeight > screenH - 8) top = Math.max(8, anchor.y - estimatedHeight - 6);
    return { top, left };
  }, [anchor, align, menuWidth, children, maxItems, itemHeight]);

  return (
    <Modal transparent visible={open} animationType="fade" onRequestClose={() => setOpen(false)}>
      <Pressable style={styles.backdrop} onPress={() => setOpen(false)}>
        <View />
      </Pressable>
      <View style={styles.absoluteFill} pointerEvents="box-none">
        <View
          onLayout={(e) => setMenuWidth(Math.max(200, e.nativeEvent.layout.width))}
          style={[styles.menu, { position: 'absolute', top: position.top, left: position.left }]}
        >
          <ScrollView style={{ maxHeight: maxItems * itemHeight }} showsVerticalScrollIndicator={false}>
            {children}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

export function DropdownMenuItem({ children, onSelect, destructive }: { children: ReactNode; onSelect?: () => void; destructive?: boolean }) {
  const { setOpen } = useDropdownMenu();
  const onPress = useCallback(() => {
    setOpen(false);
    requestAnimationFrame(() => onSelect?.());
  }, [setOpen, onSelect]);
  return (
    <Pressable onPress={onPress} android_ripple={{ color: 'rgba(0,0,0,0.08)' }} style={({ pressed }) => [styles.item, pressed && styles.itemPressed]}>
      <Text style={[styles.itemText, destructive ? styles.destructive : undefined]}>{children as any}</Text>
    </Pressable>
  );
}

export const DropdownMenuLabel = ({ children }: { children: ReactNode }) => (
  <View style={styles.labelWrap}><Text style={styles.labelText}>{children as any}</Text></View>
);

export const DropdownMenuSeparator = () => <View style={styles.separator} />;

export const DropdownMenuGroup = ({ children }: { children: ReactNode }) => <View style={styles.group}>{children}</View>;

// Not needed on RN but exported for API-compat
export const DropdownMenuPortal = ({ children }: { children: ReactNode }) => <>{children}</>;
export const DropdownMenuSub = ({ children }: { children: ReactNode }) => <>{children}</>;
export const DropdownMenuSubTrigger = ({ children }: { children: ReactNode }) => <View style={styles.subTrigger}><Text style={styles.itemText}>{children as any}</Text></View>;
export const DropdownMenuSubContent = ({ children }: { children: ReactNode }) => <View style={[styles.menu, { marginTop: 6 }]}>{children}</View>;

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'transparent'
  },
  absoluteFill: {
    position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
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
  scrollWrap: {
    // keeps iOS shadow intact when content scrolls
  },
  item: {
    paddingVertical: 18,
    paddingHorizontal: 18,
    borderRadius: 8,
  },
  itemPressed: { backgroundColor: '#F3F4F6' },
  itemText: { fontSize: 17, color: '#111827', fontWeight: '400' },
  destructive: { color: '#DC2626' },
  labelWrap: { paddingVertical: 6, paddingHorizontal: 12 },
  labelText: { fontSize: 12, color: '#6B7280', fontWeight: '700' },
  separator: { height: 1, backgroundColor: '#E5E7EB', marginVertical: 6 },
  group: { marginVertical: 2 },
  subTrigger: { paddingVertical: 10, paddingHorizontal: 12 },
});


