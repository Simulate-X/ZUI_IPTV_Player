import { useFocusable } from '@noriginmedia/norigin-spatial-navigation';
import type { UseFocusableConfig } from '@noriginmedia/norigin-spatial-navigation';

type Config = UseFocusableConfig & {
  block?: ScrollLogicalPosition;
  inline?: ScrollLogicalPosition;
};

export function useFocusableScroll({
  block = 'nearest',
  inline = 'nearest',
  onFocus: userOnFocus,
  ...config
}: Config = {}) {
  return useFocusable({
    ...config,
    onFocus: (layout, props, details) => {
      layout.node.scrollIntoView({ behavior: 'auto', block, inline });
      userOnFocus?.(layout, props, details);
    },
  });
}
