import { corsHeaders } from '../_shared/cors.ts';

interface PlanRequest {
  mission_id: string;
  site_id: string;
  natural_language: string;
  priority?: 'low' | 'normal' | 'high';
}

Deno.serve(async (req: Request) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    const { mission_id, site_id, natural_language, priority = 'normal' }: PlanRequest = await req.json();

    // Mock mission plan response
    const mockPlan = {
      mission_id,
      site_id,
      natural_language,
      constraints: {
        priority,
        no_go: ['room_101', 'maintenance_area'],
        time_window_start: null,
        time_window_end: null,
        min_battery_pct: 0.2,
      },
      subtasks: [
        {
          id: `subtask-${Date.now()}-1`,
          verb: 'navigate' as const,
          args: {
            from: 'charging_station',
            to: 'pharmacy',
            item: null,
            room: null,
            zone: 'medical_supply',
            dock: null,
          },
          policy: {
            reassign_on_blocked_s: 30,
            retry_limit: 3,
          },
        },
        {
          id: `subtask-${Date.now()}-2`,
          verb: 'pickup' as const,
          args: {
            from: 'pharmacy',
            to: null,
            item: 'medication_cart',
            room: 'pharmacy',
            zone: 'medical_supply',
            dock: null,
          },
          policy: {
            reassign_on_blocked_s: 60,
            retry_limit: 2,
          },
        },
        {
          id: `subtask-${Date.now()}-3`,
          verb: 'deliver' as const,
          args: {
            from: 'pharmacy',
            to: 'room_205',
            item: 'medication_cart',
            room: 'room_205',
            zone: 'patient_care',
            dock: null,
          },
          policy: {
            reassign_on_blocked_s: 45,
            retry_limit: 3,
          },
        },
        {
          id: `subtask-${Date.now()}-4`,
          verb: 'navigate' as const,
          args: {
            from: 'room_205',
            to: 'charging_station',
            item: null,
            room: null,
            zone: 'service',
            dock: 'dock_01',
          },
          policy: {
            reassign_on_blocked_s: 30,
            retry_limit: 2,
          },
        },
      ],
      robot_selection: {
        strategy: 'auto' as const,
        allow_vendors: ['rmf', 'vda5050', 'mock'],
        include: [],
        exclude: [],
      },
    };

    return new Response(
      JSON.stringify(mockPlan),
      {
        headers: {
          'Content-Type': 'application/json',
          ...corsHeaders,
        },
      }
    );
  } catch (error) {
    console.error('Error in plan function:', error);
    
    return new Response(
      JSON.stringify({ 
        error: 'Internal server error',
        message: error.message 
      }),
      {
        status: 500,
        headers: {
          'Content-Type': 'application/json',
          ...corsHeaders,
        },
      }
    );
  }
});