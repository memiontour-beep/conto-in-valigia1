import React, { useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Modal,
  Pressable,
  SafeAreaView,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import * as DocumentPicker from 'expo-document-picker';

const CATEGORIES = [
  { id: 'fuel', label: 'Carburante', emoji: '⛽', color: '#FF9F43' },
  { id: 'food', label: 'Spesa', emoji: '🛒', color: '#2DBE83' },
  { id: 'camping', label: 'Campeggi', emoji: '🏕️', color: '#5B8DEF' },
  { id: 'restaurant', label: 'Ristoranti', emoji: '🍝', color: '#EF6A6A' },
  { id: 'activities', label: 'Attività', emoji: '⭐', color: '#8B6DEB' },
  { id: 'tolls', label: 'Pedaggi', emoji: '🛣️', color: '#F3B72F' },
  { id: 'other', label: 'Altro', emoji: '•••', color: '#87929D' },
];

const seedTrips = [
  {
    id: 'current-demo', name: 'Dolomiti — Autunno 2026', destination: 'Trentino Alto Adige', start: '25/09/2026', end: '04/10/2026', budget: 1200, distance: 0, status: 'current',
    fuelings: [
      { id: 'f1', amount: 78, liters: 48, pricePerLiter: 1.63, km: 380, date: '27/09/2026', place: 'Bolzano', note: '' },
      { id: 'f2', amount: 74, liters: 47, pricePerLiter: 1.57, km: 420, date: '01/10/2026', place: 'Cortina', note: '' },
    ],
    expenses: [
      { id: 'ce1', amount: 78, category: 'fuel', date: '27/09/2026', place: 'Bolzano', note: 'Rifornimento', fuelId: 'f1' },
      { id: 'ce2', amount: 74, category: 'fuel', date: '01/10/2026', place: 'Cortina', note: 'Rifornimento', fuelId: 'f2' },
      { id: 'ce3', amount: 118, category: 'food', date: '28/09/2026', place: 'Brunico', note: 'Spesa' },
      { id: 'ce4', amount: 90, category: 'camping', date: '29/09/2026', place: 'San Candido', note: 'Area sosta' },
      { id: 'ce5', amount: 65, category: 'restaurant', date: '30/09/2026', place: 'Cortina', note: 'Cena' },
      { id: 'ce6', amount: 45, category: 'activities', date: '01/10/2026', place: 'Tre Cime', note: 'Parcheggio + navetta' },
      { id: 'ce7', amount: 25, category: 'tolls', date: '26/09/2026', place: 'Autostrada', note: 'Pedaggio' },
    ],
  },
  {
    id: 'past-1', name: 'Francia — Estate 2024', destination: 'Francia', start: '08/07/2024', end: '19/07/2024', budget: 1500, distance: 2340, status: 'past',
    expenses: [
      { id: 'e1', amount: 412, category: 'fuel', date: '14/07/2024', place: 'Francia', note: 'Rifornimenti' },
      { id: 'e2', amount: 248, category: 'food', date: '15/07/2024', place: 'Francia', note: 'Spesa' },
      { id: 'e3', amount: 201, category: 'camping', date: '16/07/2024', place: 'Francia', note: 'Area sosta' },
      { id: 'e4', amount: 193, category: 'restaurant', date: '17/07/2024', place: 'Nizza', note: 'Cena' },
      { id: 'e5', amount: 124, category: 'activities', date: '18/07/2024', place: 'Nizza', note: 'Museo' },
      { id: 'e6', amount: 76, category: 'tolls', date: '19/07/2024', place: 'Autostrada', note: 'Pedaggi' },
      { id: 'e7', amount: 30, category: 'other', date: '19/07/2024', place: 'Francia', note: 'Altro' },
    ],
  },
  {
    id: 'past-2', name: 'Sardegna — Primavera 2024', destination: 'Sardegna', start: '10/04/2024', end: '24/04/2024', budget: 1800, distance: 2800, status: 'past', expenses: []
  },
  {
    id: 'past-3', name: 'Dolomiti — Autunno 2023', destination: 'Dolomiti', start: '05/10/2023', end: '14/10/2023', budget: 1200, distance: 1200, status: 'past', expenses: []
  },
  {
    id: 'next-1', name: 'Dolomiti', destination: 'Trentino Alto Adige', start: '12/07/2025', end: '20/07/2025', budget: 1200, distance: 900, status: 'next', expenses: []
  },
  {
    id: 'next-2', name: 'Sardegna', destination: 'Sardegna', start: '10/08/2025', end: '24/08/2025', budget: 1800, distance: 2800, status: 'next', expenses: []
  },
  {
    id: 'next-3', name: 'Provenza', destination: 'Francia', start: '05/09/2025', end: '14/09/2025', budget: 1500, distance: 1100, status: 'next', expenses: []
  },
];

function money(n) { return `€ ${Number(n || 0).toFixed(2).replace('.', ',')}`; }
function totalOf(trip) { return (trip.expenses || []).reduce((s, e) => s + Number(e.amount || 0), 0); }
function categoryTotal(trip, id) { return (trip.expenses || []).filter(e => e.category === id).reduce((s, e) => s + Number(e.amount || 0), 0); }

function fuelStats(trip) {
  const fuelings = [...(trip?.fuelings || [])].sort((a, b) => Number(a.km || 0) - Number(b.km || 0));
  let totalLiters = 0, consumptionLiters = 0, totalCost = 0, distance = 0, validDistances = 0;
  const rows = fuelings.map((f, i) => {
    const liters = Number(f.liters || 0);
    const amount = Number(f.amount || (liters * Number(f.pricePerLiter || 0)));
    const prev = fuelings[i - 1];
    const km = Number(f.km || 0);
    const prevKm = prev ? Number(prev.km || 0) : null;
    const kmDelta = prev && km > prevKm ? km - prevKm : 0;
    totalLiters += liters; totalCost += amount;
    if (kmDelta > 0) { distance += kmDelta; consumptionLiters += liters; validDistances += 1; }
    return { ...f, amount, pricePerLiter: Number(f.pricePerLiter || (liters ? amount / liters : 0)), kmDelta,
      kmPerLiter: kmDelta > 0 && liters > 0 ? kmDelta / liters : null,
      liters100: kmDelta > 0 ? (liters / kmDelta) * 100 : null,
      euroKm: kmDelta > 0 ? amount / kmDelta : null,
      euro100: kmDelta > 0 ? (amount / kmDelta) * 100 : null };
  });
  return {
    rows, totalLiters, consumptionLiters, totalCost, distance,
    kmPerLiter: distance > 0 && consumptionLiters > 0 ? distance / consumptionLiters : null,
    liters100: distance > 0 && consumptionLiters > 0 ? (consumptionLiters / distance) * 100 : null,
    euroKm: distance > 0 ? totalCost / distance : null,
    euro100: distance > 0 ? (totalCost / distance) * 100 : null,
    validDistances
  };
}

export default function App() {
  const [trips, setTrips] = useState(seedTrips);
  const [storageLoaded, setStorageLoaded] = useState(false);
  const [tab, setTab] = useState('home');
  const [selectedTripId, setSelectedTripId] = useState(null);
  const [modal, setModal] = useState(null);
  const [newTrip, setNewTrip] = useState({ name: '', destination: '', start: '', end: '', budget: '', notes: '', stops: [] });
  const [newStop, setNewStop] = useState('');
  const [newExpense, setNewExpense] = useState({ amount: '', category: 'food', date: '', place: '', note: '' });
  const [newFuel, setNewFuel] = useState({ amount: '', liters: '', pricePerLiter: '', km: '', date: '', place: '', note: '' });
  const [editingFuelId, setEditingFuelId] = useState(null);
  const [editingExpenseId, setEditingExpenseId] = useState(null);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const raw = await AsyncStorage.getItem('conto-in-valigia-data');
        if (!active) return;
        if (raw) {
          setTrips(JSON.parse(raw));
        } else {
          // Migrazione dei dati della versione precedente
          const oldRaw = await AsyncStorage.getItem('campertrip-data');
          if (oldRaw) {
            setTrips(JSON.parse(oldRaw));
            await AsyncStorage.setItem('conto-in-valigia-data', oldRaw);
          }
        }
      } catch (e) {
        console.warn('Impossibile leggere i dati locali', e);
      } finally {
        if (active) setStorageLoaded(true);
      }
    })();
    return () => { active = false; };
  }, []);
  useEffect(() => {
    if (!storageLoaded) return;
    AsyncStorage.setItem('conto-in-valigia-data', JSON.stringify(trips)).catch(e => console.warn('Impossibile salvare i dati locali', e));
  }, [trips, storageLoaded]);

  async function exportBackup() {
    try {
      const payload = { app: 'Conto in Valigia', version: '0.20', exportedAt: new Date().toISOString(), trips };
      const uri = `${FileSystem.cacheDirectory}conto-in-valigia-backup-${Date.now()}.json`;
      await FileSystem.writeAsStringAsync(uri, JSON.stringify(payload, null, 2), { encoding: FileSystem.EncodingType.UTF8 });
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(uri, { mimeType: 'application/json', dialogTitle: 'Salva o condividi il backup di Conto in Valigia' });
      } else {
        Alert.alert('Backup creato', 'Il backup è stato creato, ma su questo dispositivo non è disponibile la condivisione.');
      }
    } catch (e) {
      Alert.alert('Backup non riuscito', 'Non è stato possibile creare il file di backup.');
    }
  }

  async function importBackup() {
    try {
      const result = await DocumentPicker.getDocumentAsync({ type: 'application/json', copyToCacheDirectory: true, multiple: false });
      if (result.canceled) return;
      const file = result.assets?.[0];
      if (!file?.uri) return;
      const raw = await FileSystem.readAsStringAsync(file.uri, { encoding: FileSystem.EncodingType.UTF8 });
      const parsed = JSON.parse(raw);
      const importedTrips = Array.isArray(parsed) ? parsed : parsed.trips;
      if (!Array.isArray(importedTrips)) throw new Error('Formato non valido');
      Alert.alert('Importare il backup?', 'I dati attuali verranno sostituiti con quelli contenuti nel backup.', [
        { text: 'Annulla', style: 'cancel' },
        { text: 'Importa', style: 'destructive', onPress: () => { setTrips(importedTrips); setSelectedTripId(null); setTab('home'); } }
      ]);
    } catch (e) {
      Alert.alert('Backup non valido', 'Il file selezionato non è un backup di Conto in Valigia valido.');
    }
  }

  async function exportCsv() {
    try {
      const rows = [['Viaggio','Stato','Destinazione','Inizio','Fine','Budget','Totale spese','Carburante','Km']];
      trips.forEach(t => rows.push([t.name, t.status, t.destination || '', t.start || '', t.end || '', Number(t.budget || 0).toFixed(2), totalOf(t).toFixed(2), categoryTotal(t, 'fuel').toFixed(2), Number(t.distance || 0)]));
      const csv = rows.map(row => row.map(v => `"${String(v).replace(/"/g, '""')}"`).join(';')).join('\n');
      const uri = `${FileSystem.cacheDirectory}conto-in-valigia-esportazione-${Date.now()}.csv`;
      await FileSystem.writeAsStringAsync(uri, '\ufeff' + csv, { encoding: FileSystem.EncodingType.UTF8 });
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(uri, { mimeType: 'text/csv', dialogTitle: 'Esporta i dati di Conto in Valigia' });
      } else {
        Alert.alert('Esportazione creata', 'Il file CSV è stato creato, ma su questo dispositivo non è disponibile la condivisione.');
      }
    } catch (e) {
      Alert.alert('Esportazione non riuscita', 'Non è stato possibile creare il file CSV.');
    }
  }

  const currentTrip = trips.find(t => t.status === 'current');
  const selectedTrip = trips.find(t => t.id === selectedTripId) || currentTrip || trips.find(t => t.status === 'past');
  const nextTrips = trips.filter(t => t.status === 'next');
  const pastTrips = trips.filter(t => t.status === 'past');

  function openTrip(trip) { setSelectedTripId(trip.id); setTab(trip.status === 'past' ? 'past' : 'next'); }
  function startTrip(id) {
    if (currentTrip && currentTrip.id !== id) {
      return Alert.alert('Hai già un viaggio in corso', `Termina prima \"${currentTrip.name}\" per iniziarne un altro.`);
    }
    setTrips(prev => prev.map(t => t.id === id ? { ...t, status: 'current' } : t));
    setSelectedTripId(id); setTab('current');
  }
  function endTrip() {
    if (!currentTrip) return;
    Alert.alert('Terminare il viaggio?', `${currentTrip.name} verrà spostato nei viaggi passati.`, [
      { text: 'Annulla', style: 'cancel' },
      { text: 'Termina viaggio', onPress: () => {
        setTrips(prev => prev.map(t => t.id === currentTrip.id ? { ...t, status: 'past', completedAt: new Date().toISOString() } : t));
        setSelectedTripId(currentTrip.id);
        setTab('past');
      }}
    ]);
  }
  function saveTrip() {
    if (!newTrip.name.trim()) return Alert.alert('Manca il nome', 'Inserisci un nome per il viaggio.');
    const trip = { id: `trip-${Date.now()}`, name: newTrip.name, destination: newTrip.destination, start: newTrip.start, end: newTrip.end, budget: Number(newTrip.budget || 0), notes: newTrip.notes, stops: newTrip.stops || [], distance: 0, status: 'next', expenses: [] };
    setTrips(prev => [trip, ...prev]); setNewTrip({ name: '', destination: '', start: '', end: '', budget: '', notes: '', stops: [] }); setNewStop(''); setModal(null);
  }
  function openExpense(category = 'food') {
    setEditingExpenseId(null);
    setNewExpense({ amount: '', category, date: new Date().toLocaleDateString('it-IT'), place: '', note: '' });
    setModal('expense');
  }
  function openExpenseEdit(expense) {
    if (expense.fuelId) return;
    setEditingExpenseId(expense.id);
    setNewExpense({ amount: String(expense.amount || ''), category: expense.category || 'food', date: expense.date || '', place: expense.place || '', note: expense.note || expense.description || '' });
    setModal('expense');
  }
  function deleteExpense(expense) {
    if (!currentTrip || expense.fuelId) return;
    Alert.alert('Eliminare la spesa?', `${categoryLabel(expense.category)} · ${money(expense.amount)}`, [
      { text: 'Annulla', style: 'cancel' },
      { text: 'Elimina', style: 'destructive', onPress: () => setTrips(prev => prev.map(t => t.id === currentTrip.id ? { ...t, expenses: (t.expenses || []).filter(e => e.id !== expense.id) } : t)) }
    ]);
  }
  function saveExpense() {
    const amount = Number(String(newExpense.amount).replace(',', '.'));
    if (!amount) return Alert.alert('Inserisci un importo');
    if (!currentTrip) return;
    if (editingExpenseId) {
      setTrips(prev => prev.map(t => t.id === currentTrip.id ? { ...t, expenses: (t.expenses || []).map(e => e.id === editingExpenseId ? { ...e, ...newExpense, amount } : e) } : t));
    } else {
      const expense = { id: `expense-${Date.now()}`, ...newExpense, amount };
      setTrips(prev => prev.map(t => t.id === currentTrip.id ? { ...t, expenses: [expense, ...(t.expenses || [])] } : t));
    }
    setEditingExpenseId(null);
    setNewExpense({ amount: '', category: 'food', date: '', place: '', note: '' }); setModal(null);
  }
  function resetFuelForm() {
    setNewFuel({ amount: '', liters: '', pricePerLiter: '', km: '', date: '', place: '', note: '' });
    setEditingFuelId(null);
  }

  function openFuelEdit(fuel) {
    setEditingFuelId(fuel.id);
    setNewFuel({ amount: String(fuel.amount || ''), liters: String(fuel.liters || ''), pricePerLiter: String(fuel.pricePerLiter || ''), km: String(fuel.km || ''), date: fuel.date || '', place: fuel.place || '', note: fuel.note || '' });
    setModal('fuel');
  }

  function saveFuel() {
    const liters = Number(String(newFuel.liters).replace(',', '.'));
    const pricePerLiter = Number(String(newFuel.pricePerLiter).replace(',', '.'));
    const km = Number(String(newFuel.km).replace(',', '.'));
    const amount = liters * pricePerLiter;
    if (!liters || !pricePerLiter || !km) return Alert.alert('Completa il rifornimento', 'Inserisci litri, prezzo al litro e km del camper.');
    if (!currentTrip) return;
    const existing = (currentTrip.fuelings || []).filter(f => f.id !== editingFuelId && Number(f.km || 0) > 0);
    if (existing.some(f => Number(f.km || 0) === km)) return Alert.alert('Controlla i km', 'Esiste già un rifornimento con questi km.');
    if (!editingFuelId) {
      const maxKm = existing.length ? Math.max(...existing.map(f => Number(f.km || 0))) : 0;
      if (maxKm && km <= maxKm) return Alert.alert('Controlla i km', `I km del camper devono essere superiori all'ultimo rifornimento (${maxKm} km).`);
      const fueling = { id: `fuel-${Date.now()}`, amount, liters, pricePerLiter, km, date: newFuel.date || new Date().toLocaleDateString('it-IT'), place: newFuel.place, note: newFuel.note };
      const expense = { id: `expense-${Date.now() + 1}`, amount, category: 'fuel', date: fueling.date, place: fueling.place, note: newFuel.note || 'Rifornimento', fuelId: fueling.id };
      setTrips(prev => prev.map(t => t.id === currentTrip.id ? { ...t, expenses: [expense, ...(t.expenses || [])], fuelings: [fueling, ...(t.fuelings || [])] } : t));
    } else {
      setTrips(prev => prev.map(t => {
        if (t.id !== currentTrip.id) return t;
        const fuelings = (t.fuelings || []).map(f => f.id === editingFuelId ? { ...f, amount, liters, pricePerLiter, km, date: newFuel.date, place: newFuel.place, note: newFuel.note } : f);
        const expenses = (t.expenses || []).map(e => e.fuelId === editingFuelId ? { ...e, amount, date: newFuel.date, place: newFuel.place, note: newFuel.note || 'Rifornimento' } : e);
        return { ...t, fuelings, expenses };
      }));
    }
    resetFuelForm();
    setModal(null);
  }

  function deleteFuel(fuel) {
    if (!currentTrip) return;
    Alert.alert('Eliminare il rifornimento?', `${fuel.place || 'Rifornimento'} · ${fuel.km} km`, [
      { text: 'Annulla', style: 'cancel' },
      { text: 'Elimina', style: 'destructive', onPress: () => {
        setTrips(prev => prev.map(t => t.id === currentTrip.id ? { ...t, fuelings: (t.fuelings || []).filter(f => f.id !== fuel.id), expenses: (t.expenses || []).filter(e => e.fuelId !== fuel.id) } : t));
      }}
    ]);
  }


  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar barStyle="dark-content" />
      <View style={styles.container}>
        <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
          {tab === 'home' && <HomeScreen nextTrips={nextTrips} currentTrip={currentTrip} pastTrips={pastTrips} onNext={() => setTab('next')} onCurrent={() => setTab('current')} onPast={() => setTab('past')} onOpen={openTrip} />}
          {tab === 'next' && <NextScreen trips={nextTrips} onOpen={openTrip} onAdd={() => setModal('trip')} onStart={startTrip} />}
          {tab === 'current' && <CurrentScreen trip={currentTrip} onAdd={openExpense} onEditExpense={openExpenseEdit} onDeleteExpense={deleteExpense} onEnd={endTrip} onFuel={() => { resetFuelForm(); setNewFuel({ amount: '', liters: '', pricePerLiter: '', km: '', date: new Date().toLocaleDateString('it-IT'), place: '', note: '' }); setModal('fuel'); }} onEditFuel={openFuelEdit} onDeleteFuel={deleteFuel} />}
          {tab === 'past' && <PastScreen trips={pastTrips} selected={selectedTrip} onOpen={setSelectedTripId} onBack={() => setSelectedTripId(null)} />}
          {tab === 'settings' && <SettingsScreen onBackup={exportBackup} onImport={importBackup} onExport={exportCsv} />}
        </ScrollView>
        <BottomNav tab={tab} setTab={setTab} />
      </View>

      <Modal visible={modal === 'trip'} animationType="slide" transparent onRequestClose={() => setModal(null)}>
        <View style={styles.modalBackdrop}><View style={styles.modalCard}>
          <Text style={styles.modalTitle}>✨ Nuovo viaggio</Text>
          <Field label="Nome" value={newTrip.name} onChangeText={v => setNewTrip({ ...newTrip, name: v })} placeholder="Es. Francia — Estate" />
          <Field label="Destinazione" value={newTrip.destination} onChangeText={v => setNewTrip({ ...newTrip, destination: v })} placeholder="Es. Provenza" />
          <View style={styles.row}><View style={{ flex: 1 }}><Field label="Partenza" value={newTrip.start} onChangeText={v => setNewTrip({ ...newTrip, start: v })} placeholder="12/07/2026" /></View><View style={{ width: 12 }} /><View style={{ flex: 1 }}><Field label="Rientro" value={newTrip.end} onChangeText={v => setNewTrip({ ...newTrip, end: v })} placeholder="20/07/2026" /></View></View>
          <Field label="Budget (facoltativo)" value={newTrip.budget} onChangeText={v => setNewTrip({ ...newTrip, budget: v })} placeholder="1500" keyboardType="decimal-pad" />
          <Text style={styles.label}>Tappe <Text style={styles.optionalLabel}>(facoltative)</Text></Text>
          <View style={styles.stopAddRow}>
            <TextInput value={newStop} onChangeText={setNewStop} style={[styles.input, { flex: 1, marginBottom: 0 }]} placeholder="Es. Verona" placeholderTextColor="#9AA5AE" onSubmitEditing={() => { const v = newStop.trim(); if (v) { setNewTrip({ ...newTrip, stops: [...(newTrip.stops || []), v] }); setNewStop(''); } }} />
            <Pressable style={styles.stopAddButton} onPress={() => { const v = newStop.trim(); if (v) { setNewTrip({ ...newTrip, stops: [...(newTrip.stops || []), v] }); setNewStop(''); } }}><Text style={styles.stopAddText}>+</Text></Pressable>
          </View>
          {(newTrip.stops || []).length > 0 && <View style={styles.stopsList}>
            {(newTrip.stops || []).map((stop, index) => <View key={`${stop}-${index}`} style={styles.stopRow}>
              <Text style={styles.stopIndex}>{index + 1}</Text><Text style={styles.stopName}>{stop}</Text>
              <Pressable onPress={() => { const a = [...newTrip.stops]; if (index > 0) [a[index-1], a[index]] = [a[index], a[index-1]]; setNewTrip({ ...newTrip, stops: a }); }} disabled={index === 0}><Text style={[styles.stopControl, index === 0 && styles.stopDisabled]}>↑</Text></Pressable>
              <Pressable onPress={() => { const a = [...newTrip.stops]; if (index < a.length - 1) [a[index], a[index+1]] = [a[index+1], a[index]]; setNewTrip({ ...newTrip, stops: a }); }} disabled={index === newTrip.stops.length - 1}><Text style={[styles.stopControl, index === newTrip.stops.length - 1 && styles.stopDisabled]}>↓</Text></Pressable>
              <Pressable onPress={() => setNewTrip({ ...newTrip, stops: newTrip.stops.filter((_, i) => i !== index) })}><Text style={styles.stopDelete}>×</Text></Pressable>
            </View>)}
          </View>}
          <Field label="Note (facoltative)" value={newTrip.notes} onChangeText={v => setNewTrip({ ...newTrip, notes: v })} placeholder="Appunti sul viaggio..." />
          <Button label="Salva viaggio" onPress={saveTrip} /><Button label="Annulla" variant="ghost" onPress={() => setModal(null)} />
        </View></View>
      </Modal>

      <Modal visible={modal === 'expense'} animationType="slide" transparent onRequestClose={() => setModal(null)}>
        <View style={styles.modalBackdrop}><View style={styles.modalCard}>
          <Text style={styles.modalTitle}>{editingExpenseId ? '✏️ Modifica spesa' : '➕ Nuova spesa'}</Text>
          <Field label="Importo" value={newExpense.amount} onChangeText={v => setNewExpense({ ...newExpense, amount: v })} placeholder="25,00" keyboardType="decimal-pad" />
          <Text style={styles.label}>Categoria</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingBottom: 12 }}>
            {CATEGORIES.filter(c => c.id !== 'fuel').map(c => <Pressable key={c.id} onPress={() => setNewExpense({ ...newExpense, category: c.id })} style={[styles.categoryChip, newExpense.category === c.id && { borderColor: c.color, backgroundColor: '#F2FBF8' }]}><Text>{c.emoji} {c.label}</Text></Pressable>)}
          </ScrollView>
          <Field label="Data" value={newExpense.date} onChangeText={v => setNewExpense({ ...newExpense, date: v })} placeholder="12/07/2026" />
          <Field label="Luogo" value={newExpense.place} onChangeText={v => setNewExpense({ ...newExpense, place: v })} placeholder="Es. Nizza" />
          <Field label="Nota" value={newExpense.note} onChangeText={v => setNewExpense({ ...newExpense, note: v })} placeholder="Es. cena, supermercato..." />
          <Button label={editingExpenseId ? "Salva modifiche" : "Salva spesa"} onPress={saveExpense} /><Button label="Annulla" variant="ghost" onPress={() => setModal(null)} />
        </View></View>
      </Modal>

      <Modal visible={modal === 'fuel'} animationType="slide" transparent onRequestClose={() => setModal(null)}>
        <View style={styles.modalBackdrop}><View style={styles.modalCard}>
          <Text style={styles.modalTitle}>{editingFuelId ? '✏️ Modifica rifornimento' : '⛽ Rifornimento'}</Text>
          <View style={styles.quickStats}>
            <View style={styles.quickStat}><Text style={styles.quickStatLabel}>Totale automatico</Text><Text style={styles.quickStatValue}>{newFuel.liters && newFuel.pricePerLiter ? money(Number(newFuel.liters.replace(',', '.')) * Number(newFuel.pricePerLiter.replace(',', '.'))) : '—'}</Text></View>
            <View style={styles.quickStat}><Text style={styles.quickStatLabel}>Km camper</Text><Text style={styles.quickStatValue}>{newFuel.km || '—'}</Text></View>
          </View>
          <View style={styles.row}><View style={{ flex: 1 }}><Field label="Litri" value={newFuel.liters} onChangeText={v => setNewFuel({ ...newFuel, liters: v })} placeholder="38,5" keyboardType="decimal-pad" /></View><View style={{ width: 12 }} /><View style={{ flex: 1 }}><Field label="Prezzo/L" value={newFuel.pricePerLiter} onChangeText={v => setNewFuel({ ...newFuel, pricePerLiter: v })} placeholder="1,62" keyboardType="decimal-pad" /></View></View>
          <Field label="Km del camper" value={newFuel.km} onChangeText={v => setNewFuel({ ...newFuel, km: v })} placeholder="12450" keyboardType="decimal-pad" />
          <Field label="Data" value={newFuel.date} onChangeText={v => setNewFuel({ ...newFuel, date: v })} placeholder="12/07/2026" />
          <Field label="Luogo" value={newFuel.place} onChangeText={v => setNewFuel({ ...newFuel, place: v })} placeholder="Es. Trento" />
          <Field label="Nota" value={newFuel.note} onChangeText={v => setNewFuel({ ...newFuel, note: v })} placeholder="Es. autostrada..." />
          <Button label={editingFuelId ? "Salva modifiche" : "Salva rifornimento"} onPress={saveFuel} /><Button label="Annulla" variant="ghost" onPress={() => { resetFuelForm(); setModal(null); }} />
        </View></View>
      </Modal>
    </SafeAreaView>
  );
}

function HomeScreen({ nextTrips, currentTrip, pastTrips, onNext, onCurrent, onPast, onOpen }) {
  return <>
    <Text style={styles.brand}>Conto in Valigia <Text style={{ fontSize: 20 }}>🧳</Text></Text>
    <Text style={styles.tagline}>Le tue avventure, le tue spese.</Text>
    <View style={styles.offlineBanner}><Text style={styles.offlineDot}>●</Text><View style={{ flex: 1 }}><Text style={styles.offlineTitle}>Funziona offline</Text><Text style={styles.offlineText}>I tuoi viaggi e le tue spese vengono salvati sul dispositivo. Internet non è necessaria.</Text></View></View>
    <View style={styles.hero}><Text style={styles.heroEmoji}>🚐</Text><Text style={styles.heroTitle}>Pronti a partire?</Text><Text style={styles.heroText}>Organizza il viaggio, registra le spese e scopri quanto ti è costata l’avventura.</Text></View>
    <HomeTile emoji="🗓️" title="Prossimi viaggi" text="Organizza la prossima avventura" onPress={onNext} />
    <HomeTile emoji="🚐" title="Viaggio in corso" text={currentTrip ? currentTrip.name : 'Nessun viaggio in corso'} onPress={onCurrent} />
    <HomeTile emoji="🕘" title="Viaggi passati" text={`${pastTrips.length} viaggi con resoconto`} onPress={onPast} />
    <Text style={styles.sectionTitle}>La prossima partenza</Text>
    {nextTrips[0] && <TripCard trip={nextTrips[0]} onPress={() => onOpen(nextTrips[0])} />}
  </>;
}

function NextScreen({ trips, onOpen, onAdd, onStart }) {
  return <><Header title="Prossimi viaggi" action="+" onAction={onAdd} /><Text style={styles.muted}>Organizza le tue prossime avventure.</Text>{trips.map(t => <TripCard key={t.id} trip={t} onPress={() => onOpen(t)} />)}{!trips.length && <Empty text="Nessun viaggio programmato." />}{trips[0] && <Button label="🚐  Inizia il prossimo viaggio" onPress={() => onStart(trips[0].id)} />}</>;
}

function CurrentScreen({ trip, onAdd, onFuel, onStop, onEnd, onEditFuel, onDeleteFuel, onEditExpense, onDeleteExpense }) {
  if (!trip) return <Empty text="Nessun viaggio in corso." />;
  const total=totalOf(trip);
  const budget=Number(trip.budget||0);
  const remaining=Math.max(0,budget-total);
  const pct=budget?Math.min(100,total/budget*100):0;
  const start=new Date(trip.start || trip.startDate);
  const days=Math.max(1,Math.floor((Date.now()-start.getTime())/86400000)+1);
  const expenses=(trip.expenses||[]).slice(-6).reverse();
  const fuel=(trip.expenses||[]).filter(e=>e.category==='fuel').reduce((s,e)=>s+Number(e.amount||0),0);
  const km=trip.currentKm && trip.startKm ? Math.max(0,Number(trip.currentKm)-Number(trip.startKm)) : 0;

  return <>
    <View style={styles.tripHeader}>
      <View style={{flex:1}}>
        <Text style={styles.eyebrow}>🚐 VIAGGIO IN CORSO</Text>
        <Text style={styles.tripTitle}>{trip.name}</Text>
        <Text style={styles.tripSub}>📍 {trip.destination}</Text>
      </View>
      <View style={styles.offlinePill}><Text style={styles.offlinePillText}>● Offline</Text></View>
    </View>

    <View style={styles.dashboardCard}>
      <Text style={styles.dashboardLabel}>TOTALE SPESO</Text>
      <Text style={styles.dashboardTotal}>{money(total)}</Text>
      <View style={styles.dashboardRow}>
        <View><Text style={styles.dashboardSmall}>Budget</Text><Text style={styles.dashboardValue}>{money(budget)}</Text></View>
        <View><Text style={styles.dashboardSmall}>Rimanente</Text><Text style={styles.dashboardValue}>{money(remaining)}</Text></View>
        <View><Text style={styles.dashboardSmall}>Utilizzato</Text><Text style={styles.dashboardValue}>{Math.round(pct)}%</Text></View>
      </View>
      <View style={styles.progress}><View style={[styles.progressFill,{width:`${pct}%`}]}/></View>
    </View>

    <View style={styles.statsGrid}>
      <StatBox emoji="📅" label="Giorni" value={String(days)} />
      <StatBox emoji="🚐" label="Km percorsi" value={km ? `${km}` : '—'} />
      <StatBox emoji="⛽" label="Carburante" value={money(fuel)} />
    </View>

    <View style={styles.tripInfoCard}>
      <Text style={styles.sectionTitle}>🗺️ Dettagli viaggio</Text>
      <View style={styles.tripInfoRow}><Text style={styles.tripInfoLabel}>Partenza</Text><Text style={styles.tripInfoValue}>{trip.startDate || '—'}</Text></View>
      <View style={styles.tripInfoRow}><Text style={styles.tripInfoLabel}>Rientro previsto</Text><Text style={styles.tripInfoValue}>{trip.endDate || '—'}</Text></View>
      <View style={styles.tripInfoRow}><Text style={styles.tripInfoLabel}>Tappe</Text><Text style={styles.tripInfoValue}>{(trip.stops || []).length}</Text></View>
      {trip.notes ? <View style={{marginTop:8}}><Text style={styles.tripInfoLabel}>Note</Text><Text style={styles.tripInfoNote}>{trip.notes}</Text></View> : null}
    </View>

    <Text style={styles.sectionTitle}>Azioni rapide</Text>
    <View style={styles.quickGrid}>
      <QuickAction emoji="➕" title="Spesa" onPress={onAdd} />
      <QuickAction emoji="⛽" title="Rifornimento" onPress={onFuel} />
      <QuickAction emoji="⛺" title="Sosta" onPress={onStop} />
    </View>

    {(() => {
      const fs = fuelStats(trip);
      return <View>
        <View style={styles.sectionHeader}><Text style={styles.sectionTitle}>⛽ Rifornimenti</Text><Text style={styles.sectionHint}>{fs.rows.length} registrati</Text></View>
        <View style={styles.fuelCard}>
          <View style={styles.fuelMetric}><Text style={styles.fuelMetricLabel}>Km/L</Text><Text style={styles.fuelMetricValue}>{fs.kmPerLiter ? fs.kmPerLiter.toFixed(1).replace('.', ',') : '—'}</Text></View>
          <View style={styles.fuelMetric}><Text style={styles.fuelMetricLabel}>L/100 km</Text><Text style={styles.fuelMetricValue}>{fs.liters100 ? fs.liters100.toFixed(1).replace('.', ',') : '—'}</Text></View>
          <View style={styles.fuelMetric}><Text style={styles.fuelMetricLabel}>€/100 km</Text><Text style={styles.fuelMetricValue}>{fs.euro100 ? money(fs.euro100) : '—'}</Text></View>
        </View>
        {fs.rows.slice().reverse().map((f, i) => <View key={f.id || i} style={styles.expenseRow}>
          <View style={styles.expenseIcon}><Text>⛽</Text></View>
          <Pressable style={{flex:1}} onPress={() => onEditFuel && onEditFuel(f)}>
            <Text style={styles.expenseName}>{f.place || 'Rifornimento'} · {f.km} km</Text>
            <Text style={styles.expenseMeta}>{f.date} · {f.liters.toFixed(1).replace('.', ',')} L · {money(f.pricePerLiter)}/L{f.kmPerLiter ? ` · ${f.kmPerLiter.toFixed(1).replace('.', ',')} km/L` : ''}</Text>
            <Text style={styles.fuelActionHint}>Tocca per modificare</Text>
          </Pressable>
          <View style={{alignItems:'flex-end', marginLeft:8}}>
            <Text style={styles.expenseAmount}>{money(f.amount)}</Text>
            <Pressable onPress={() => onDeleteFuel && onDeleteFuel(f)}><Text style={styles.deleteLink}>Elimina</Text></Pressable>
          </View>
        </View>)}
        {!fs.rows.length && <Empty text="Ancora nessun rifornimento registrato." />}
      </View>;
    })()}

    <Text style={styles.sectionTitle}>📊 Riepilogo spese</Text>
    {(() => {
      const nonFuel = (trip.expenses || []).filter(e => e.category !== 'fuel');
      const otherTotal = nonFuel.reduce((sum, e) => sum + Number(e.amount || 0), 0);
      const days = dateDiff(trip.start || trip.startDate, trip.end || trip.endDate || trip.start || trip.startDate);
      const daily = total / Math.max(1, days);
      const grouped = {};
      nonFuel.forEach(e => { grouped[e.category] = (grouped[e.category] || 0) + Number(e.amount || 0); });
      const rows = Object.entries(grouped).sort((a,b) => b[1] - a[1]);
      return <View style={styles.categoryCard}>
        <View style={styles.quickStats}>
          <View style={styles.quickStat}><Text style={styles.quickStatLabel}>Totale viaggio</Text><Text style={styles.quickStatValue}>{money(total)}</Text></View>
          <View style={styles.quickStat}><Text style={styles.quickStatLabel}>Media/giorno</Text><Text style={styles.quickStatValue}>{money(daily)}</Text></View>
          <View style={styles.quickStat}><Text style={styles.quickStatLabel}>Carburante</Text><Text style={styles.quickStatValue}>{money(fuel)}</Text></View>
        </View>
        <View style={styles.budgetMini}><Text style={styles.budgetMiniText}>Budget</Text><Text style={styles.budgetMiniValue}>{money(budget)}</Text></View>
        <View style={styles.progress}><View style={[styles.progressFill,{width:`${pct}%`}]}/></View>
        <Text style={[styles.muted,{marginTop:7,marginBottom:10}]}>{budget ? `${Math.round(pct)}% del budget utilizzato · ${money(Math.max(0,budget-total))} rimanenti` : 'Nessun budget impostato'}</Text>
        {rows.length ? rows.map(([cat,val]) => {
          const c = CATEGORIES.find(x => x.id === cat) || CATEGORIES[CATEGORIES.length - 1];
          const share = otherTotal ? Math.round(val / otherTotal * 100) : 0;
          return <View key={cat} style={styles.catRow}>
            <View style={styles.catLabelWrap}><Text>{c.emoji}</Text><Text style={styles.catName}>{c.label}</Text></View>
            <View style={styles.catBar}><View style={[styles.catFill,{width:`${share}%`,backgroundColor:c.color}]}/></View>
            <Text style={styles.catValue}>{money(val)}</Text>
          </View>;
        }) : <Text style={styles.muted}>Nessuna spesa non carburante registrata.</Text>}
      </View>;
    })()}

    <Text style={styles.sectionTitle}>Ultime spese</Text>
    {expenses.length ? expenses.map((e,i)=>
      <View key={e.id||i} style={styles.expenseRow}>
        <View style={styles.expenseIcon}><Text>{categoryEmoji(e.category)}</Text></View>
        <Pressable style={{flex:1}} onPress={() => onEditExpense && onEditExpense(e)}>
          <Text style={styles.expenseName}>{e.description || categoryLabel(e.category)}</Text><Text style={styles.expenseMeta}>{e.date}{e.place ? ` · ${e.place}` : ''}</Text>
          {!e.fuelId && <Text style={styles.fuelActionHint}>Tocca per modificare</Text>}
        </Pressable>
        <View style={{alignItems:'flex-end', marginLeft:8}}>
          <Text style={styles.expenseAmount}>{money(Number(e.amount||0))}</Text>
          {!e.fuelId && <Pressable onPress={() => onDeleteExpense && onDeleteExpense(e)}><Text style={styles.deleteLink}>Elimina</Text></Pressable>}
        </View>
      </View>
    ) : <Empty text="Ancora nessuna spesa. Aggiungi la prima!" />}

    <Pressable onPress={onEnd} style={styles.endTripButton}>
      <Text style={styles.endTripText}>🏁 Termina viaggio</Text>
    </Pressable>
  </>;
} 

function StatBox({emoji,label,value}) {
  return <View style={styles.statBox}><Text style={{fontSize:22}}>{emoji}</Text><Text style={styles.statValue}>{value}</Text><Text style={styles.statLabel}>{label}</Text></View>;
}
function QuickAction({emoji,title,onPress}) {
  return <Pressable onPress={onPress} style={styles.quickAction}><Text style={{fontSize:27}}>{emoji}</Text><Text style={styles.quickActionText}>{title}</Text></Pressable>;
}
function categoryEmoji(c) {
  return ({fuel:'⛽', toll:'🛣️', campsite:'⛺', restaurant:'🍝', food:'🛒', activity:'🎟️', maintenance:'🔧', other:'🛍️'})[c] || '💶';
}
function categoryLabel(c) {
  return ({fuel:'Carburante', toll:'Pedaggio', campsite:'Sosta', restaurant:'Ristorante', food:'Spesa', activity:'Attività', maintenance:'Manutenzione', other:'Altra spesa'})[c] || 'Spesa';
}

function PastScreen({ trips, selected, onOpen, onBack }) {
  if (selected && trips.some(t => t.id === selected.id)) {
    return <PastDetail trip={selected} onBack={onBack} />;
  }
  return <>
    <Text style={styles.pageTitle}>📚 Viaggi passati</Text>
    <Text style={styles.pageSub}>I tuoi viaggi e tutti i loro resoconti, disponibili anche offline.</Text>
    {trips.length ? trips.map(t => <PastTripCard key={t.id} trip={t} onPress={() => onOpen(t.id)} />)
      : <Empty text="Non hai ancora terminato un viaggio." />}
  </>;
}

function PastTripCard({ trip, onPress }) {
  const total=totalOf(trip);
  const days=Math.max(1, trip.endDate && trip.startDate ? Math.floor((new Date(trip.endDate)-new Date(trip.startDate))/86400000)+1 : 1);
  const km=trip.currentKm && trip.startKm ? Math.max(0,Number(trip.currentKm)-Number(trip.startKm)) : 0;
  return <Pressable onPress={onPress} style={styles.pastCard}>
    <View style={{flex:1}}>
      <Text style={styles.pastCardTitle}>{trip.name}</Text>
      <Text style={styles.pastCardSub}>📍 {trip.destination}</Text>
      <Text style={styles.pastCardMeta}>📅 {trip.startDate} → {trip.endDate || '—'} · {days} {days===1?'giorno':'giorni'}</Text>
    </View>
    <View style={{alignItems:'flex-end'}}>
      <Text style={styles.pastTotal}>{money(total)}</Text>
      <Text style={styles.arrow}>›</Text>
    </View>
  </Pressable>;
}

function PastDetail({ trip, onBack }) {
  const total=totalOf(trip);
  const budget=Number(trip.budget||0);
  const days=Math.max(1, trip.endDate && trip.startDate ? Math.floor((new Date(trip.endDate)-new Date(trip.startDate))/86400000)+1 : 1);
  const expenses=trip.expenses||[];
  const fuel=expenses.filter(e=>e.category==='fuel');
  const fuelTotal=fuel.reduce((s,e)=>s+Number(e.amount||0),0);
  const km=trip.currentKm && trip.startKm ? Math.max(0,Number(trip.currentKm)-Number(trip.startKm)) : 0;
  const categories={};
  expenses.forEach(e=>{ categories[e.category]=(categories[e.category]||0)+Number(e.amount||0); });
  const sorted=Object.entries(categories).sort((a,b)=>b[1]-a[1]);

  return <>
    <Pressable onPress={onBack}><Text style={styles.backLink}>‹ Indietro</Text></Pressable>
    <Text style={styles.pageTitle}>{trip.name}</Text>
    <Text style={styles.pageSub}>📍 {trip.destination} · {trip.startDate} → {trip.endDate || '—'}</Text>

    <View style={styles.pastHero}>
      <Text style={styles.dashboardLabel}>TOTALE SPESO</Text>
      <Text style={styles.dashboardTotal}>{money(total)}</Text>
      <View style={styles.dashboardRow}>
        <View><Text style={styles.dashboardSmall}>Budget</Text><Text style={styles.dashboardValue}>{money(budget)}</Text></View>
        <View><Text style={styles.dashboardSmall}>Media/giorno</Text><Text style={styles.dashboardValue}>{money(total/days)}</Text></View>
        <View><Text style={styles.dashboardSmall}>Spese</Text><Text style={styles.dashboardValue}>{expenses.length}</Text></View>
      </View>
    </View>

    <View style={styles.statsGrid}>
      <StatBox emoji="📅" label="Giorni" value={String(days)} />
      <StatBox emoji="🚐" label="Km" value={km ? String(km) : '—'} />
      <StatBox emoji="⛽" label="Carburante" value={money(fuelTotal)} />
    </View>

    {(() => {
      const fs = fuelStats(trip);
      return <View>
        <Text style={styles.sectionTitle}>⛽ Dati carburante</Text>
        <View style={styles.fuelCard}>
          <View style={styles.fuelMetric}><Text style={styles.fuelMetricLabel}>Litri totali</Text><Text style={styles.fuelMetricValue}>{fs.totalLiters ? fs.totalLiters.toFixed(1).replace('.', ',') : '—'}</Text></View>
          <View style={styles.fuelMetric}><Text style={styles.fuelMetricLabel}>Km/L</Text><Text style={styles.fuelMetricValue}>{fs.kmPerLiter ? fs.kmPerLiter.toFixed(1).replace('.', ',') : '—'}</Text></View>
          <View style={styles.fuelMetric}><Text style={styles.fuelMetricLabel}>€/100 km</Text><Text style={styles.fuelMetricValue}>{fs.euro100 ? money(fs.euro100) : '—'}</Text></View>
        </View>
        <View style={styles.fuelMetricRow2}>
          <View style={styles.fuelMetric}><Text style={styles.fuelMetricLabel}>L/100 km</Text><Text style={styles.fuelMetricValue}>{fs.liters100 ? fs.liters100.toFixed(1).replace('.', ',') : '—'}</Text></View>
          <View style={styles.fuelMetric}><Text style={styles.fuelMetricLabel}>€/km</Text><Text style={styles.fuelMetricValue}>{fs.euroPerKm ? money(fs.euroPerKm) : '—'}</Text></View>
          <View style={styles.fuelMetric}><Text style={styles.fuelMetricLabel}>Rifornimenti</Text><Text style={styles.fuelMetricValue}>{(trip.fuelings||[]).length}</Text></View>
        </View>
        {(trip.fuelings||[]).length > 0 && <>
          <Text style={styles.subSectionTitle}>Storico rifornimenti</Text>
          {(trip.fuelings||[]).slice().sort((a,b)=>Number(a.km||0)-Number(b.km||0)).map((f,i) =>
            <View key={f.id||i} style={styles.fuelHistoryRow}>
              <View style={{flex:1}}>
                <Text style={styles.expenseName}>⛽ {f.place || 'Rifornimento'}</Text>
                <Text style={styles.expenseMeta}>{f.date || '—'} · {Number(f.km||0)} km · {Number(f.liters||0).toFixed(1).replace('.', ',')} L</Text>
              </View>
              <View style={{alignItems:'flex-end'}}>
                <Text style={styles.expenseAmount}>{money(Number(f.amount || Number(f.liters||0)*Number(f.pricePerLiter||0)))}</Text>
                <Text style={styles.expenseMeta}>{Number(f.pricePerLiter||0).toFixed(2).replace('.', ',')} €/L</Text>
              </View>
            </View>
          )}
        </>}
      </View>;
    })()}

    <Text style={styles.sectionTitle}>📊 Spese per categoria</Text>
    {sorted.length ? sorted.map(([cat,val]) =>
      <View key={cat} style={styles.categoryRow}>
        <View style={styles.categoryLeft}><Text style={{fontSize:20}}>{categoryEmoji(cat)}</Text><Text style={styles.categoryName}>{categoryLabel(cat)}</Text></View>
        <Text style={styles.categoryAmount}>{money(val)}</Text>
      </View>
    ) : <Empty text="Nessuna spesa registrata." />}

    <Text style={styles.sectionTitle}>🗺️ Tappe</Text>
    {trip.stops && trip.stops.length ? trip.stops.map((s,i)=>
      <View key={i} style={styles.stopRow}><Text>📍</Text><Text style={styles.stopText}>{typeof s === 'string' ? s : (s.name || s.place || '')}</Text></View>
    ) : <Text style={styles.muted}>Nessuna tappa inserita.</Text>}

    <Text style={styles.sectionTitle}>📝 Note</Text>
    <View style={styles.notesBox}><Text style={styles.notesText}>{trip.note || trip.notes || 'Nessuna nota.'}</Text></View>

    <Text style={styles.sectionTitle}>🧾 Tutte le spese</Text>
    {expenses.length ? expenses.map((e,i)=>
      <View key={e.id||i} style={styles.expenseRow}>
        <View style={styles.expenseIcon}><Text>{categoryEmoji(e.category)}</Text></View>
        <View style={{flex:1}}><Text style={styles.expenseName}>{e.description || categoryLabel(e.category)}</Text><Text style={styles.expenseMeta}>{e.date}{e.place ? ` · ${e.place}` : ''}</Text></View>
        <Text style={styles.expenseAmount}>{money(Number(e.amount||0))}</Text>
      </View>
    ) : <Empty text="Nessuna spesa." />}
  </>;
}

function SettingsScreen({ onBackup, onImport, onExport }) { return <><Header title="Impostazioni" /><Setting icon="🚐" title="Profilo veicolo" sub="Modello, consumi, targa" /><Setting icon="🏷️" title="Categorie di spesa" sub="Personalizza le categorie" /><Setting icon="📏" title="Unità e preferenze" sub="Km, litri, valuta" /><Setting icon="💾" title="Crea backup" sub="Salva tutti i viaggi in un file" onPress={onBackup} /><Setting icon="📥" title="Ripristina backup" sub="Importa un backup precedentemente salvato" onPress={onImport} /><Setting icon="📤" title="Esporta dati" sub="Esporta un file CSV leggibile anche con Excel" onPress={onExport} /><Setting icon="ℹ️" title="Informazioni app" sub="Conto in Valigia 0.20 · funziona offline" /></>; }

function Header({ title, action, onAction }) { return <View style={styles.header}><Text style={styles.headerTitle}>{title}</Text>{action && <Pressable onPress={onAction} style={styles.headerAction}><Text style={styles.headerActionText}>{action}</Text></Pressable>}</View>; }
function HomeTile({ emoji, title, text, onPress }) { return <Pressable onPress={onPress} style={styles.homeTile}><Text style={styles.tileEmoji}>{emoji}</Text><View style={{ flex: 1 }}><Text style={styles.tileTitle}>{title}</Text><Text style={styles.tileText}>{text}</Text></View><Text style={styles.arrow}>›</Text></Pressable>; }
function TripCard({ trip, onPress }) { const total = totalOf(trip); const stops = trip.stops || []; return <Pressable onPress={onPress} style={styles.card}><View style={styles.cardImage}><Text style={{ fontSize: 32 }}>{trip.destination?.includes('Sardegna') ? '🏝️' : trip.destination?.includes('Francia') ? '🌅' : '🏔️'}</Text></View><View style={{ flex: 1 }}><Text style={styles.cardTitle}>{trip.name}</Text><Text style={styles.cardSub}>{trip.start} — {trip.end}</Text><Text style={styles.cardSub}>📍 {trip.destination}</Text>{stops.length > 0 && <Text style={styles.cardSub}>🧭 {stops.length} {stops.length === 1 ? 'tappa' : 'tappe'}</Text>}<View style={styles.badge}><Text style={styles.badgeText}>Budget: {money(trip.budget)}</Text></View>{trip.status === 'past' && <Text style={styles.cardTotal}>Speso: {money(total)}</Text>}</View><Text style={styles.arrow}>›</Text></Pressable>; }
function PastCard({ trip, onPress }) { return <TripCard trip={trip} onPress={onPress} />; }
function QuickAction({ emoji, title, subtitle, onPress, color }) { return <Pressable onPress={onPress} style={styles.quickAction}><View style={[styles.quickActionIcon, { backgroundColor: color }]}><Text style={{ fontSize: 24 }}>{emoji}</Text></View><View style={{ flex: 1 }}><Text style={styles.quickActionTitle}>{title}</Text><Text style={styles.quickActionSub}>{subtitle}</Text></View><Text style={styles.quickActionArrow}>+</Text></Pressable>; }
function ExpenseRow({ expense }) { const c = CATEGORIES.find(x => x.id === expense.category) || CATEGORIES[6]; return <View style={styles.expenseRow}><View style={[styles.expenseIcon, { backgroundColor: c.color + '22' }]}><Text>{c.emoji}</Text></View><View style={{ flex: 1 }}><Text style={styles.expenseTitle}>{c.label}</Text><Text style={styles.expenseSub}>{expense.place || '—'} · {expense.date || '—'}{expense.note ? ` · ${expense.note}` : ''}</Text></View><Text style={styles.expenseAmount}>{money(expense.amount)}</Text></View>; }
function Stat({ label, value }) { return <View style={styles.stat}><Text style={styles.statLabel}>{label}</Text><Text style={styles.statValue}>{value}</Text></View>; }
function Setting({ icon, title, sub, onPress }) { const content = <View style={styles.setting}><Text style={styles.settingIcon}>{icon}</Text><View style={{ flex: 1 }}><Text style={styles.settingTitle}>{title}</Text><Text style={styles.settingSub}>{sub}</Text></View><Text style={styles.arrow}>›</Text></View>; return onPress ? <Pressable onPress={onPress}>{content}</Pressable> : content; }
function Field({ label, ...props }) { return <View><Text style={styles.label}>{label}</Text><TextInput {...props} style={styles.input} placeholderTextColor="#9AA5AE" /></View>; }
function Button({ label, onPress, variant }) { return <Pressable onPress={onPress} style={[styles.button, variant === 'ghost' && styles.buttonGhost]}><Text style={[styles.buttonText, variant === 'ghost' && styles.buttonGhostText]}>{label}</Text></Pressable>; }
function Empty({ text }) { return <View style={styles.empty}><Text style={{ fontSize: 42 }}>🗺️</Text><Text style={styles.emptyTitle}>{text}</Text></View>; }
function BottomNav({ tab, setTab }) { const items = [['home','⌂','Home'],['next','🗓️','Prossimi'],['current','🚐','In corso'],['past','🕘','Passati'],['settings','⚙️','Altro']]; return <View style={styles.nav}>{items.map(([id, emoji, label]) => <Pressable key={id} onPress={() => setTab(id)} style={styles.navItem}><Text style={[styles.navEmoji, tab === id && styles.navActive]}>{emoji}</Text><Text style={[styles.navLabel, tab === id && styles.navActive]}>{label}</Text></Pressable>)}</View>; }
function dateDiff(a, b) { const parse = s => { const p = (s || '').split('/').map(Number); return p.length === 3 ? new Date(p[2], p[1] - 1, p[0]) : new Date(); }; return Math.max(1, Math.round((parse(b) - parse(a)) / 86400000) + 1); }

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#F7FBFA' }, container: { flex: 1 }, scroll: { padding: 20, paddingBottom: 100 },
  brand: { fontSize: 34, fontWeight: '900', color: '#154B45', letterSpacing: -1.5, marginTop: 8 }, tagline: { fontSize: 15, color: '#71807D', marginBottom: 18 },
  tripHeader: { flexDirection:'row', alignItems:'flex-start', marginBottom:14 },
  tripTitle: { fontSize:26, fontWeight:'900', color:'#173F3A', marginTop:3 },
  tripSub: { color:'#687773', marginTop:4 },
  offlinePill: { backgroundColor:'#EAF8F1', borderRadius:16, paddingHorizontal:10, paddingVertical:7 },
  offlinePillText: { color:'#247353', fontWeight:'800', fontSize:11 },
  dashboardCard: { backgroundColor:'#E7F6F1', borderRadius:24, padding:20, marginBottom:12 },
  dashboardLabel: { fontSize:11, fontWeight:'900', color:'#5F746E', letterSpacing:1 },
  dashboardTotal: { fontSize:35, fontWeight:'900', color:'#174C45', marginTop:3, marginBottom:16 },
  dashboardRow: { flexDirection:'row', justifyContent:'space-between' },
  dashboardSmall: { fontSize:11, color:'#71807D' },
  dashboardValue: { fontSize:15, fontWeight:'900', color:'#204D47', marginTop:3 },
  statsGrid: { flexDirection:'row', gap:9, marginBottom:5 },
  statBox: { flex:1, backgroundColor:'#fff', borderRadius:18, padding:12, borderWidth:1, borderColor:'#E5ECEA' },
  statValue: { fontSize:16, fontWeight:'900', color:'#20312E', marginTop:5 },
  statLabel: { fontSize:10, color:'#788580', marginTop:2 },
  quickGrid: { flexDirection:'row', gap:10, marginBottom:4 },
  quickAction: { flex:1, backgroundColor:'#fff', borderRadius:18, padding:15, alignItems:'center', borderWidth:1, borderColor:'#E5ECEA' },
  quickActionText: { fontWeight:'900', color:'#263632', marginTop:7 },
  expenseRow: { flexDirection:'row', alignItems:'center', backgroundColor:'#fff', borderRadius:17, padding:12, marginBottom:8, borderWidth:1, borderColor:'#E7ECEA' },
  expenseIcon: { width:40, height:40, borderRadius:14, backgroundColor:'#F3F7F5', alignItems:'center', justifyContent:'center', marginRight:10 },
  expenseName: { fontWeight:'800', color:'#263632' },
  expenseMeta: { fontSize:11, color:'#788580', marginTop:3 },
  expenseAmount: { fontWeight:'900', color:'#204D47', marginLeft:8 },
  endTripButton: { backgroundColor:'#FFF1F0', borderRadius:18, padding:15, alignItems:'center', marginTop:14, marginBottom:18 },
  endTripText: { color:'#A54842', fontWeight:'900' },
  pastCard: { flexDirection:'row', alignItems:'center', backgroundColor:'#fff', borderRadius:20, padding:16, marginBottom:10, borderWidth:1, borderColor:'#E5ECEA' },
  pastCardTitle: { fontSize:18, fontWeight:'900', color:'#20312E' },
  pastCardSub: { color:'#687773', marginTop:4 },
  pastCardMeta: { color:'#8A9692', fontSize:11, marginTop:6 },
  pastTotal: { fontSize:16, fontWeight:'900', color:'#204D47' },
  pastHero: { backgroundColor:'#E7F6F1', borderRadius:24, padding:20, marginTop:12, marginBottom:12 },
  backLink: { color:'#246B60', fontWeight:'900', fontSize:15, marginBottom:8 },
  categoryRow: { flexDirection:'row', justifyContent:'space-between', alignItems:'center', backgroundColor:'#fff', borderRadius:16, padding:13, marginBottom:7, borderWidth:1, borderColor:'#E7ECEA' },
  categoryLeft: { flexDirection:'row', alignItems:'center', gap:10 },
  categoryName: { fontWeight:'800', color:'#263632' },
  categoryAmount: { fontWeight:'900', color:'#204D47' },
  stopRow: { flexDirection:'row', alignItems:'center', gap:8, backgroundColor:'#fff', borderRadius:14, padding:12, marginBottom:7 },
  stopText: { color:'#33423E', fontWeight:'700' },
  notesBox: { backgroundColor:'#fff', borderRadius:16, padding:15, borderWidth:1, borderColor:'#E5ECEA' },
  notesText: { color:'#4C5B57', lineHeight:20 },
  muted: { color:'#8A9692', fontSize:12, marginBottom:8 },
  hero: { backgroundColor: '#E6F7F1', borderRadius: 24, padding: 22, marginBottom: 18 }, heroEmoji: { fontSize: 56 }, heroTitle: { fontSize: 25, fontWeight: '900', color: '#174C45', marginTop: 8 }, heroText: { color: '#59706B', lineHeight: 21, marginTop: 5 },
  homeTile: { flexDirection: 'row', alignItems: 'center', padding: 16, borderRadius: 20, backgroundColor: '#fff', marginBottom: 10, borderWidth: 1, borderColor: '#E5ECEA' }, tileEmoji: { fontSize: 30, marginRight: 14 }, tileTitle: { fontSize: 17, fontWeight: '800', color: '#20312E' }, tileText: { color: '#788580', marginTop: 3 }, arrow: { fontSize: 28, color: '#9AA5A2', marginLeft: 8 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 6, marginBottom: 8 }, headerTitle: { fontSize: 28, fontWeight: '900', color: '#183B36', letterSpacing: -0.7 }, headerAction: { width: 42, height: 42, borderRadius: 21, backgroundColor: '#DFF6ED', alignItems: 'center', justifyContent: 'center' }, headerActionText: { fontSize: 24, color: '#13785F' },
  muted: { color: '#788580', marginBottom: 16 }, sectionTitle: { fontSize: 19, fontWeight: '900', color: '#20312E', marginTop: 22, marginBottom: 12 },
  card: { backgroundColor: '#fff', borderRadius: 20, padding: 12, marginBottom: 12, flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: '#E5ECEA' }, cardImage: { width: 72, height: 72, borderRadius: 16, backgroundColor: '#EAF7F4', alignItems: 'center', justifyContent: 'center', marginRight: 12 }, cardTitle: { fontSize: 17, fontWeight: '800', color: '#20312E' }, cardSub: { color: '#77837F', fontSize: 12, marginTop: 3 }, badge: { alignSelf: 'flex-start', marginTop: 6, paddingHorizontal: 8, paddingVertical: 4, backgroundColor: '#ECF8F4', borderRadius: 8 }, badgeText: { color: '#16785F', fontSize: 11, fontWeight: '700' }, cardTotal: { fontSize: 12, color: '#1C765F', fontWeight: '800', marginTop: 4 },
  tripHero: { backgroundColor: '#E7F6F1', borderRadius: 22, padding: 18, marginTop: 10 }, tripHeroEmoji: { fontSize: 45 }, tripHeroTitle: { fontSize: 25, fontWeight: '900', color: '#184B44', marginTop: 6 },
  statsRow: { flexDirection: 'row', gap: 8, marginTop: 12 }, stat: { flex: 1, backgroundColor: '#fff', borderRadius: 16, padding: 12, borderWidth: 1, borderColor: '#E6ECEA' }, statLabel: { fontSize: 11, color: '#84908D' }, statValue: { fontSize: 17, fontWeight: '900', color: '#1C4E46', marginTop: 4 },
  progress: { height: 10, borderRadius: 5, backgroundColor: '#E5ECEA', overflow: 'hidden' }, progressFill: { height: '100%', backgroundColor: '#20A77D', borderRadius: 5 },
  catRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 }, catName: { width: 105, fontSize: 12, color: '#34423F' }, catBar: { flex: 1, height: 8, backgroundColor: '#EDF1F0', borderRadius: 4, overflow: 'hidden' }, catFill: { height: '100%', borderRadius: 4 }, catValue: { width: 74, textAlign: 'right', fontSize: 12, fontWeight: '800', color: '#34423F' },
  button: { backgroundColor: '#18A57B', borderRadius: 16, minHeight: 52, alignItems: 'center', justifyContent: 'center', marginTop: 16 }, buttonText: { color: '#fff', fontWeight: '900', fontSize: 16 }, buttonGhost: { backgroundColor: 'transparent' }, buttonGhostText: { color: '#6C7975' },
  expenseRow: { backgroundColor: '#fff', borderRadius: 16, padding: 12, marginBottom: 8, flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: '#E7ECEB' }, expenseIcon: { width: 40, height: 40, borderRadius: 13, alignItems: 'center', justifyContent: 'center', marginRight: 10 }, expenseTitle: { fontWeight: '800', color: '#25332F' }, expenseSub: { color: '#84908D', fontSize: 11, marginTop: 3 }, expenseAmount: { fontWeight: '900', color: '#253F39' },
  pastHero: { backgroundColor: '#EAF7F3', borderRadius: 22, padding: 18, marginTop: 10 }, pastHeroEmoji: { fontSize: 42 }, pastTitle: { fontSize: 23, fontWeight: '900', color: '#184B44', marginTop: 5 },
  setting: { backgroundColor: '#fff', borderRadius: 18, padding: 15, marginBottom: 9, flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: '#E7ECEB' }, settingIcon: { fontSize: 25, marginRight: 13 }, settingTitle: { fontWeight: '800', color: '#273632' }, settingSub: { color: '#87918E', fontSize: 12, marginTop: 2 },
  empty: { alignItems: 'center', justifyContent: 'center', padding: 40 }, emptyTitle: { textAlign: 'center', color: '#75817E', fontSize: 15, marginTop: 12, lineHeight: 22 },
  nav: { position: 'absolute', bottom: 0, left: 0, right: 0, height: 76, backgroundColor: '#fff', borderTopWidth: 1, borderTopColor: '#E5ECEA', flexDirection: 'row', justifyContent: 'space-around', paddingTop: 8 }, navItem: { alignItems: 'center', width: 70 }, navEmoji: { fontSize: 20, opacity: 0.45 }, navLabel: { fontSize: 10, color: '#87918E', marginTop: 3, fontWeight: '700' }, navActive: { color: '#14936E', opacity: 1 },
  tripHeroTop: { flexDirection: 'row', alignItems: 'center' }, eyebrow: { color: '#278B70', fontSize: 10, fontWeight: '900', letterSpacing: 0.8, marginBottom: 4 }, budgetMini: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 18, marginBottom: 8 }, budgetMiniText: { color: '#5F716C', fontSize: 12, fontWeight: '700' }, budgetMiniValue: { color: '#174C45', fontSize: 12, fontWeight: '900' }, tripHeroEmoji: { fontSize: 38, marginLeft: 8 }, sectionHeader: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between' }, sectionHint: { color: '#8A9692', fontSize: 11, marginBottom: 12 }, quickGrid: { gap: 9 }, quickAction: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', borderRadius: 18, padding: 12, borderWidth: 1, borderColor: '#E7ECEB' }, quickActionIcon: { width: 48, height: 48, borderRadius: 15, alignItems: 'center', justifyContent: 'center', marginRight: 12 }, quickActionTitle: { fontSize: 15, fontWeight: '900', color: '#25332F' }, quickActionSub: { color: '#89948F', fontSize: 11, marginTop: 2 }, quickActionArrow: { fontSize: 25, color: '#16A078', fontWeight: '700', paddingHorizontal: 6 }, categoryCard: { backgroundColor: '#fff', borderRadius: 18, padding: 15, borderWidth: 1, borderColor: '#E7ECEB' }, catLabelWrap: { width: 105, flexDirection: 'row', alignItems: 'center' }, catDot: { width: 7, height: 7, borderRadius: 4, marginRight: 7 }, fuelCard: { backgroundColor: '#FFF9EF', borderRadius: 18, padding: 15, flexDirection: 'row', borderWidth: 1, borderColor: '#F5E5C9' }, fuelMetric: { flex: 1 }, fuelMetricRow2: { flexDirection:'row', marginTop:10, paddingTop:10, borderTopWidth:1, borderTopColor:'#EEE6D8' }, subSectionTitle: { fontSize:13, fontWeight:'900', color:'#5B4C35', marginTop:14, marginBottom:7 }, fuelHistoryRow: { flexDirection:'row', alignItems:'center', backgroundColor:'#FFFDF8', borderRadius:12, padding:10, marginBottom:7, borderWidth:1, borderColor:'#EEE6D8' }, fuelMetricLabel: { fontSize: 10, color: '#8B806D', marginBottom: 4 }, fuelMetricValue: { fontSize: 14, fontWeight: '900', color: '#5B4C35' }, quickStats: { flexDirection: 'row', gap: 8, marginBottom: 4 }, quickStat: { flex: 1, backgroundColor: '#FFF9EF', borderRadius: 13, padding: 10 }, quickStatLabel: { fontSize: 10, color: '#8B806D' }, quickStatValue: { fontSize: 15, fontWeight: '900', color: '#5B4C35', marginTop: 2 }, fuelActionHint: { color: '#9A8D78', fontSize: 9, marginTop: 4 }, deleteLink: { color: '#C94B4B', fontSize: 10, fontWeight: '900', marginTop: 6 },
  tripInfoCard: { backgroundColor:'#fff', borderRadius:18, padding:15, marginTop:14, borderWidth:1, borderColor:'#E5ECEA' }, tripInfoRow: { flexDirection:'row', justifyContent:'space-between', alignItems:'center', paddingVertical:7, borderBottomWidth:1, borderBottomColor:'#EEF2F1' }, tripInfoLabel: { color:'#7A8783', fontSize:12 }, tripInfoValue: { color:'#263C37', fontWeight:'800', fontSize:12 }, tripInfoNote: { color:'#4C5B57', lineHeight:19, marginTop:4 },
  modalBackdrop: { flex: 1, backgroundColor: 'rgba(15,30,27,0.38)', justifyContent: 'flex-end' }, modalCard: { backgroundColor: '#fff', borderTopLeftRadius: 28, borderTopRightRadius: 28, padding: 20, paddingBottom: 30, maxHeight: '92%' }, modalTitle: { fontSize: 25, fontWeight: '900', color: '#183B36', marginBottom: 10 }, label: { fontSize: 12, color: '#6F7B77', fontWeight: '800', marginBottom: 6, marginTop: 8 }, input: { borderWidth: 1, borderColor: '#DCE6E3', borderRadius: 14, height: 48, paddingHorizontal: 14, color: '#21332F', backgroundColor: '#FAFCFB' }, row: { flexDirection: 'row' }, categoryChip: { borderWidth: 1, borderColor: '#E0E8E5', borderRadius: 14, paddingVertical: 10, paddingHorizontal: 12, backgroundColor: '#fff' }
});
