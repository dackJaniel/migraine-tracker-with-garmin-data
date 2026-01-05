/**
 * Debug DB Page - Shows raw database content
 */
import { useState, useEffect } from 'react';
import { db } from '@/lib/db';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { RefreshCw } from 'lucide-react';

export default function DebugDB() {
  const [garminData, setGarminData] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  const loadData = async () => {
    setLoading(true);
    try {
      const data = await db.garminData.toArray();
      setGarminData(data);
    } catch (error) {
      console.error('Failed to load data:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  return (
    <div className="container mx-auto p-4 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Database Debug</h1>
        <Button onClick={loadData} disabled={loading}>
          <RefreshCw
            className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`}
          />
          Reload
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Garmin Data ({garminData.length} entries)</CardTitle>
        </CardHeader>
        <CardContent>
          <pre className="bg-slate-900 text-green-400 p-4 rounded-lg overflow-auto max-h-[600px] text-sm">
            {JSON.stringify(garminData, null, 2)}
          </pre>
        </CardContent>
      </Card>

      {garminData.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Sample Entry (Latest)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <p>
                <strong>Date:</strong> {garminData[0].date}
              </p>
              <p>
                <strong>Sleep Score:</strong>{' '}
                {garminData[0].sleepScore ?? 'null'}
              </p>
              <p>
                <strong>Steps:</strong> {garminData[0].steps ?? 'null'}
              </p>
              <p>
                <strong>Resting HR:</strong> {garminData[0].restingHR ?? 'null'}
              </p>
              <p>
                <strong>HRV:</strong> {garminData[0].hrv ?? 'null'}
              </p>
              <p>
                <strong>Stress Level:</strong>{' '}
                {JSON.stringify(garminData[0].stressLevel ?? 'null')}
              </p>
              <p>
                <strong>Body Battery:</strong>{' '}
                {JSON.stringify(garminData[0].bodyBattery ?? 'null')}
              </p>
              <p>
                <strong>Synced At:</strong> {garminData[0].syncedAt}
              </p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
