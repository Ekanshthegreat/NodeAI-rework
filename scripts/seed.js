import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';

// Load environment variables
config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing required environment variables');
  console.error('Please ensure VITE_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are set');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function seedDatabase() {
  console.log('🌱 Starting database seed...');

  try {
    // Clear existing data
    console.log('🧹 Clearing existing data...');
    await supabase.from('events').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    await supabase.from('mission_plans').delete().neq('mission_id', '00000000-0000-0000-0000-000000000000');
    await supabase.from('missions').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    await supabase.from('robots').delete().neq('id', 'none');
    await supabase.from('sites').delete().neq('id', 'none');

    // Insert site
    console.log('🏥 Creating site: HospitalA-F2...');
    const { error: siteError } = await supabase
      .from('sites')
      .insert([
        {
          id: 'HospitalA-F2',
          name: 'Hospital Alpha - Floor 2',
          map_url: '/maps/hospital-f2.png',
          origin: { x: 0, y: 0 },
          scale_m_per_px: 0.05,
        },
      ]);

    if (siteError) throw siteError;

    // Insert robots
    console.log('🤖 Creating robots...');
    const { error: robotsError } = await supabase
      .from('robots')
      .insert([
        {
          id: 'MED-001',
          site_id: 'HospitalA-F2',
          vendor: 'rmf',
          pose: { x: 2.5, y: 1.0, theta: 0.0 },
          battery: 0.85,
          status: 'IDLE',
        },
        {
          id: 'MED-002',
          site_id: 'HospitalA-F2',
          vendor: 'vda5050',
          pose: { x: -1.5, y: 3.2, theta: 1.57 },
          battery: 0.42,
          status: 'CHARGING',
        },
        {
          id: 'MED-003',
          site_id: 'HospitalA-F2',
          vendor: 'mock',
          pose: { x: 4.0, y: -2.1, theta: -0.78 },
          battery: 0.67,
          status: 'ACTIVE',
        },
      ]);

    if (robotsError) throw robotsError;

    // Insert sample missions
    console.log('🎯 Creating sample missions...');
    const { data: missions, error: missionsError } = await supabase
      .from('missions')
      .insert([
        {
          site_id: 'HospitalA-F2',
          nl: 'Deliver medication from pharmacy to room 205',
          status: 'active',
        },
        {
          site_id: 'HospitalA-F2',
          nl: 'Transport lab samples from room 210 to laboratory',
          status: 'completed',
        },
        {
          site_id: 'HospitalA-F2',
          nl: 'Perform security patrol of all patient rooms',
          status: 'planning',
        },
      ])
      .select();

    if (missionsError) throw missionsError;

    // Insert sample events
    console.log('📝 Creating sample events...');
    const events = [];
    
    missions.forEach((mission, index) => {
      const robotIds = ['MED-001', 'MED-002', 'MED-003'];
      const eventTypes = ['mission_started', 'robot_assigned', 'task_completed', 'mission_completed'];
      
      // Create 2-3 events per mission
      for (let i = 0; i < 2 + index; i++) {
        events.push({
          mission_id: mission.id,
          robot_id: robotIds[i % robotIds.length],
          type: eventTypes[i % eventTypes.length],
          payload: {
            message: `Event ${i + 1} for mission ${mission.nl.slice(0, 30)}...`,
            timestamp: new Date(Date.now() - (index * 3600000) - (i * 600000)).toISOString(),
          },
          ts: new Date(Date.now() - (index * 3600000) - (i * 600000)).toISOString(),
        });
      }
    });

    const { error: eventsError } = await supabase
      .from('events')
      .insert(events);

    if (eventsError) throw eventsError;

    console.log('✅ Database seeded successfully!');
    console.log(`   - 1 site created (HospitalA-F2)`);
    console.log(`   - 3 robots created`);
    console.log(`   - ${missions.length} missions created`);
    console.log(`   - ${events.length} events created`);

  } catch (error) {
    console.error('❌ Error seeding database:', error);
    process.exit(1);
  }
}

seedDatabase();