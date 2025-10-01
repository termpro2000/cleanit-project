import React, { useState } from 'react';
import { Calendar, momentLocalizer } from 'react-big-calendar';
import moment from 'moment';
import 'react-big-calendar/lib/css/react-big-calendar.css';
import BackToDashboard from '../components/BackToDashboard';

const localizer = momentLocalizer(moment);

const SchedulerScreen: React.FC = () => {
  const [events, setEvents] = useState([
    {
      id: 0,
      title: '청소 작업 A',
      start: new Date(2025, 9, 20, 9, 0, 0),
      end: new Date(2025, 9, 20, 10, 0, 0),
      resourceId: 1,
    },
    {
      id: 1,
      title: '청소 작업 B',
      start: new Date(2025, 9, 20, 11, 0, 0),
      end: new Date(2025, 9, 20, 12, 0, 0),
      resourceId: 2,
    },
  ]);

  const handleSelectEvent = (event: any) => {
    alert(`선택된 작업: ${event.title}`);
  };

  const handleSelectSlot = ({ start, end }: { start: Date; end: Date }) => {
    const title = window.prompt('새 작업명:');
    if (title) {
      setEvents([
        ...events,
        { id: events.length, title, start, end, resourceId: 1 }, // Assign to a default resource for now
      ]);
    }
  };

  return (
    <>
      <BackToDashboard />
      <div style={{ height: 700 }}>
        <h1>작업 스케줄러</h1>
        <Calendar
          localizer={localizer}
          events={events}
          startAccessor="start"
          endAccessor="end"
          selectable
          onSelectEvent={handleSelectEvent}
          onSelectSlot={handleSelectSlot}
          style={{ height: 500 }}
        />
      </div>
    </>
  );
};

export default SchedulerScreen;
