import React from 'react';
import { WorldPage } from './WorldPage';
import { WORLDS_DATA } from './worldsConfig';

export const LeadershipWorld: React.FC = () => <WorldPage config={WORLDS_DATA.leadership} />;
