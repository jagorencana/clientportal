import React from 'react';
import { AssetAvatar, AssetAvatarProps } from './AssetAvatar';

export type AssetFlagAvatarProps = AssetAvatarProps;

export const AssetFlagAvatar: React.FC<AssetFlagAvatarProps> = (props) => {
  return <AssetAvatar {...props} />;
};

export { AssetAvatar };
