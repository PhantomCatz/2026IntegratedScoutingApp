import '../public/stylesheets/strategicScout.css';
import { useEffect, useState} from 'react';
import { useLocalStorage, } from 'react-use';
import { Table } from 'antd';
import { Tabs } from '../parts/tabs.tsx';
import Header from '../parts/header.tsx';
import QrCode from '../parts/qrCodeViewer.tsx';
import { isInPlayoffs, getTeamsInMatch, getAllianceTags, parseRobotPosition, getRobotPositionOptions } from '../utils/tbaRequest.ts';
import { escapeUnicode } from '../utils/utils.ts';
import { getFieldAccessor } from '../parts/formItems.tsx';
import Form, { NumberInput, Select, Input, TextArea, } from '../parts/formItems.tsx';
import Constants from '../utils/constants.ts';

import type * as TbaApi from '../types/tbaApi.ts';
import type * as StrategicScoutTypes from '../types/strategicScout.ts';
import type * as Database from '../types/database.ts';
import type * as ResultTypes from '../types/resultTypes.ts';

function EasterEgg(props: Props): React.ReactElement {
	return (
		<>
			<Header name="Easter Egg" back="#/" />

			<easter-egg>
				<b>You found the easter egg!</b>
			</easter-egg>
		</>
	);
}

export default EasterEgg;
