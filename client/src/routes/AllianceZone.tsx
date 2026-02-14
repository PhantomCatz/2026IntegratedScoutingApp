import '../public/stylesheets/style.css';
import { useLocalStorage } from 'react-use';
import { useState, useEffect, useRef } from 'react';
import Header from '../parts/header';
import QrCode from '../parts/qrCodeViewer';
import { getTeamsNotScouted } from '../utils/tbaRequest';
import { escapeUnicode } from '../utils/utils';
import Form from '../parts/formItems';
import { getFieldAccessor } from '../parts/formItems';
import Constants from '../utils/constants';

import type * as TbaApi from '../types/tbaApi';
import type * as AllianceZoneTypes from '../types/allianceZone';
import { Tabs } from '../parts/tabs';
import type { TabItems } from '../parts/tabs';

type Props = {
  title: string;
};

const formDefaultValues = {
  team_number: 0,
  scouter_initials: '',
} as const;

function AllianceZone(props: Props): React.ReactElement {
  const [_eventKey] = useLocalStorage<TbaApi.EventKey>('eventKey', Constants.EVENT_KEY);
  const [isLoading, setLoading] = useState(false);
  const [qrValue, setQrValue] = useState<unknown>();
  const robotImageInput = useRef<HTMLInputElement>(null);
  const [tabNum, setTabNum] = useState<string>('1');

  if (!_eventKey) {
    throw new Error('Could not get event key');
  }

  const eventKey = _eventKey;
  const accessor = getFieldAccessor<AllianceZoneTypes.Alliance>();

  const items: TabItems = [
    { key: '1', label: 'Pre', children: <div /> },
    { key: '2', label: 'AllianceZone', children: <div /> },
  ];

  useEffect(() => {
    document.title = props.title;
  }, [props.title]);

  useEffect(() => {
    void (async function () {
      const initialMessage = 'Teams not scouted:\n';
      let message = initialMessage;

      try {
        const teamsNotScouted = await getTeamsNotScouted(eventKey);

        if (teamsNotScouted === null) {
          throw new Error('Could not access teams');
        }

        teamsNotScouted.sort((a, b) => a - b);
        message += teamsNotScouted.join('\n');

        if (message === initialMessage) {
          window.alert('All teams have been scouted.');
        } else {
          window.alert(message);
        }
      } catch (err) {
        console.error('Error in fetching teams: ', err);
      }
    })();
  }, [eventKey]);

  function submitData(event: AllianceZoneTypes.Alliance): void {
    const body: AllianceZoneTypes.SubmitBody = {
      match_event: eventKey,
      team_number: event.team_number,
      scouter_initials: event.scouter_initials.toLowerCase(),
    };

    Object.entries(body).forEach(([field, value]) => {
      const newVal = typeof value === 'string' ? escapeUnicode(value) : value;
      const access = field as keyof typeof body;
      body[access] = newVal as never;
    });

    void tryFetch(body).then((successful) => {
      if (successful) {
        window.alert('Submit successful.');
      } else {
        window.alert('Submit was not successful. Please show the QR to WebDev.');
      }
    });

    setQrValue(body);
  }

  async function tryFetch(body: AllianceZoneTypes.SubmitBody): Promise<boolean> {
    try {
      let fetchLink = Constants.SERVER_ADDRESS;

      if (!fetchLink) {
        console.error('Could not get fetch link; Check .env');
        return false;
      }

      fetchLink += 'reqType=submitAllianceData';

      const response = await fetch(fetchLink, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
      });

      return response.ok;
    } catch (err) {
      console.error('Submit error:', err);
      return false;
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <Header name="Alliance Zone" back="#scoutingapp" />

      <alliance-zone>
        <Form<AllianceZoneTypes.Alliance>
          initialValues={formDefaultValues}
          onFinish={submitData}
          onFinishFailed={(_values, errorFields) => {
            const errorMessage = Object.entries(errorFields)
              .map((x) => x[0])
              .join('\n');
            window.alert(errorMessage);
          }}
          accessor={accessor}
        >
          <Tabs
            defaultActiveKey="1"
            activeKey={tabNum}
            items={items}
            onChange={(key) => setTabNum(key)}
          />

          <footer>
            {Number(tabNum) > 1 && (
              <button
                type="button"
                onMouseDown={() => setTabNum((Number(tabNum) - 1).toString())}
                className="tabButton"
              >
                Back
              </button>
            )}

            {Number(tabNum) < items.length && (
              <button
                type="button"
                onMouseDown={() => setTabNum((Number(tabNum) + 1).toString())}
                className="tabButton"
              >
                Next
              </button>
            )}

            {Number(tabNum) === items.length && (
              <button type="submit" className="submitButton">
                Submit
              </button>
            )}

            {isLoading && <h2>Submitting data...</h2>}
          </footer>
        </Form>

        <QrCode value={qrValue} />
      </alliance-zone>
    </>
  );
}

export default AllianceZone;
