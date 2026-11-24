
import { useEffect, useMemo, useState } from 'react';
import DateTimePicker from '@react-native-community/datetimepicker';

import {
  getTasks,
  createTask,
  updateTask,
  deleteTask as deleteTaskAPI,
} from '../services/api';

import {
  View,
  Text,
  TextInput,
  Pressable,
  ScrollView,
  StyleSheet,
  Keyboard,
  Alert,
  Platform,
  Modal,
} from 'react-native';

import { SafeAreaView } from 'react-native-safe-area-context';

type Priority = 'Low' | 'Medium' | 'High';

type TaskFilter =
  | 'All'
  | 'Pending'
  | 'Completed'
  | 'Low'
  | 'Medium'
  | 'High';

type SortOrder = 'Soonest' | 'Latest';

type ActivePicker =
  | 'addDate'
  | 'addTime'
  | 'editDate'
  | 'editTime'
  | null;

type Task = {
  id: number;
  title: string;
  priority: Priority;
  completed: boolean;
  due_date: string | null;
  due_time: string | null;
};

const priorityColors: Record<Priority, string> = {
  Low: '#C9E5B9',
  Medium: '#F8D28D',
  High: '#F3B9C1',
};

const taskCardColors = [
  '#DCEFD6',
  '#F9DDA4',
  '#E4D5F3',
  '#CDEAF0',
  '#F5CFC0',
  '#F3C2C8',
];

export default function HomeScreen() {
  const [tasks, setTasks] = useState<Task[]>([]);

  const [taskFilter, setTaskFilter] = useState<TaskFilter>('All');
  const [sortOrder, setSortOrder] = useState<SortOrder>('Soonest');

  const [newTask, setNewTask] = useState('');
  const [priority, setPriority] = useState<Priority>('Medium');

  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  // ADD TASK DATE AND TIME
  const [dueDate, setDueDate] = useState<Date | null>(null);
  const [dueTime, setDueTime] = useState<Date | null>(null);

  // EDIT TASK STATES
  const [editingTaskId, setEditingTaskId] = useState<number | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [editPriority, setEditPriority] = useState<Priority>('Medium');
  const [editDueDate, setEditDueDate] = useState<Date | null>(null);
  const [editDueTime, setEditDueTime] = useState<Date | null>(null);

  // ONLY ONE PICKER CAN BE OPEN AT A TIME
  const [activePicker, setActivePicker] = useState<ActivePicker>(null);

  // FORMAT API TASKS
  function formatTasks(data: any[]): Task[] {
    return data.map(task => ({
      id: task.id,
      title: task.title,
      priority: (
        task.priority.charAt(0).toUpperCase() +
        task.priority.slice(1)
      ) as Priority,
      completed: Boolean(task.is_completed),
      due_date: task.due_date,
      due_time: task.due_time,
    }));
  }

  // LOAD TASKS FROM MYSQL
  useEffect(() => {
    async function loadTasks() {
      try {
        const data = await getTasks();
        setTasks(formatTasks(data));
      } catch (error) {
        console.error('Error loading tasks:', error);

        Alert.alert(
          'Loading failed',
          'Your tasks could not be loaded. Please try again.'
        );
      } finally {
        setIsLoading(false);
      }
    }

    loadTasks();
  }, []);

  // DAILY PROGRESS
  const completedTasks = tasks.filter(task => task.completed).length;

  const progress = useMemo(() => {
    if (tasks.length === 0) return 0;
    return (completedTasks / tasks.length) * 100;
  }, [tasks, completedTasks]);

  // FILTER AND SORT TASKS
  const visibleTasks = useMemo(() => {
    let result = [...tasks];

    if (taskFilter === 'Pending') {
      result = result.filter(task => !task.completed);
    } else if (taskFilter === 'Completed') {
      result = result.filter(task => task.completed);
    } else if (
      taskFilter === 'Low' ||
      taskFilter === 'Medium' ||
      taskFilter === 'High'
    ) {
      result = result.filter(task => task.priority === taskFilter);
    }

    result.sort((a, b) => {
      if (!a.due_date && !b.due_date) return 0;
      if (!a.due_date) return 1;
      if (!b.due_date) return -1;

      const dateA = `${a.due_date}T${a.due_time || '23:59:59'}`;
      const dateB = `${b.due_date}T${b.due_time || '23:59:59'}`;

      return sortOrder === 'Soonest'
        ? dateA.localeCompare(dateB)
        : dateB.localeCompare(dateA);
    });

    return result;
  }, [tasks, taskFilter, sortOrder]);

  // FORMAT DATE FOR MYSQL
  function formatDate(date: Date | null): string | null {
    if (!date) return null;

    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
  }

  // FORMAT TIME FOR MYSQL
  function formatTime(time: Date | null): string | null {
    if (!time) return null;

    return `${String(time.getHours()).padStart(2, '0')}:${String(time.getMinutes()).padStart(2, '0')}:00`;
  }

  // ADD A NEW TASK
  async function addTask() {
    if (!newTask.trim() || isSaving) return;

    setIsSaving(true);

    try {
      await createTask(
        newTask.trim(),
        priority,
        formatDate(dueDate),
        formatTime(dueTime)
      );

      const data = await getTasks();
      setTasks(formatTasks(data));

      setNewTask('');
      setPriority('Medium');
      setDueDate(null);
      setDueTime(null);
      setActivePicker(null);

      Keyboard.dismiss();
    } catch (error) {
      console.error('Error adding task:', error);

      Alert.alert(
        'Something went wrong',
        'Your task could not be saved. Please try again.'
      );
    } finally {
      setIsSaving(false);
    }
  }

  // COMPLETE OR UNCOMPLETE A TASK
  async function toggleTask(id: number) {
    const selectedTask = tasks.find(task => task.id === id);
    if (!selectedTask) return;

    try {
      await updateTask(id, {
        is_completed: !selectedTask.completed,
      });

      setTasks(previousTasks =>
        previousTasks.map(task =>
          task.id === id
            ? { ...task, completed: !task.completed }
            : task
        )
      );
    } catch (error) {
      console.error('Error updating task:', error);

      Alert.alert(
        'Update failed',
        'Your task could not be updated. Please try again.'
      );
    }
  }

  // HANDLE DATE PICKER
  function handleDateChange(event: any, selectedDate?: Date) {
    if (event.type === 'set' && selectedDate) {
      if (activePicker === 'addDate') {
        setDueDate(selectedDate);
      } else if (activePicker === 'editDate') {
        setEditDueDate(selectedDate);
      }
    }

    setActivePicker(null);
  }

  // HANDLE TIME PICKER
  function handleTimeChange(event: any, selectedTime?: Date) {
    if (event.type === 'set' && selectedTime) {
      if (activePicker === 'addTime') {
        setDueTime(selectedTime);
      } else if (activePicker === 'editTime') {
        setEditDueTime(selectedTime);
      }
    }

    setActivePicker(null);
  }

  // START EDITING A TASK
  function startEditing(task: Task) {
    setEditingTaskId(task.id);
    setEditTitle(task.title);
    setEditPriority(task.priority);

    setEditDueDate(
      task.due_date
        ? new Date(`${task.due_date}T00:00:00`)
        : null
    );

    setEditDueTime(
      task.due_time
        ? new Date(`2000-01-01T${task.due_time}`)
        : null
    );

    setActivePicker(null);
  }

  // SAVE EDITED TASK
  async function saveEditedTask() {
    if (editingTaskId === null || !editTitle.trim()) {
      Alert.alert('Missing title', 'Please enter a task title.');
      return;
    }

    try {
      const formattedDate = formatDate(editDueDate);
      const formattedTime = formatTime(editDueTime);

      await updateTask(editingTaskId, {
        title: editTitle.trim(),
        priority: editPriority.toLowerCase() as 'low' | 'medium' | 'high',
        due_date: formattedDate,
        due_time: formattedTime,
      });

      setTasks(previousTasks =>
        previousTasks.map(task =>
          task.id === editingTaskId
            ? {
                ...task,
                title: editTitle.trim(),
                priority: editPriority,
                due_date: formattedDate,
                due_time: formattedTime,
              }
            : task
        )
      );

      setEditingTaskId(null);
      setActivePicker(null);
      Keyboard.dismiss();
    } catch (error) {
      console.error('Error saving edited task:', error);

      Alert.alert(
        'Update failed',
        'Your changes could not be saved.'
      );
    }
  }

  // CANCEL EDITING
  function cancelEditing() {
    setEditingTaskId(null);
    setActivePicker(null);
    Keyboard.dismiss();
  }

  // DELETE A TASK
  async function deleteTask(id: number) {
    Alert.alert(
      'Delete task?',
      'Are you sure you want to delete this task?',
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteTaskAPI(id);

              setTasks(currentTasks =>
                currentTasks.filter(task => task.id !== id)
              );
            } catch (error) {
              console.error('Error deleting task:', error);

              Alert.alert(
                'Delete failed',
                'Your task could not be deleted. Please try again.'
              );
            }
          },
        },
      ]
    );
  }

  // GET A TASK'S PASTEL COLOUR
  function getTaskColor(id: number) {
    return taskCardColors[id % taskCardColors.length];
  }

  // PICKER SETTINGS
  const isDatePicker =
    activePicker === 'addDate' || activePicker === 'editDate';

  const pickerValue =
    activePicker === 'addDate'
      ? dueDate || new Date()
      : activePicker === 'editDate'
        ? editDueDate || new Date()
        : activePicker === 'addTime'
          ? dueTime || new Date()
          : editDueTime || new Date();

  const pickerTitle = isDatePicker
    ? 'Select a date'
    : 'Select a time';

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView
        contentContainerStyle={styles.container}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* HEADER */}
        <View style={styles.header}>
          <View>
            <Text style={styles.logo}>MyTasks.</Text>

            <Text style={styles.date}>
              {new Date().toLocaleDateString('en-GH', {
                weekday: 'long',
                month: 'long',
                day: 'numeric',
              })}
            </Text>
          </View>

          <View style={styles.avatar}>
            <View style={styles.avatarInner}>
              <Text style={styles.avatarText}>M</Text>
            </View>
          </View>
        </View>

        {/* GREETING */}
        <View style={styles.greetingSection}>
          <Text style={styles.greeting}>Hello there!</Text>

          <Text style={styles.subtitle}>
            Let's make today a productive one.
          </Text>
        </View>

        {/* PROGRESS CARD */}
        <View style={styles.progressCard}>
          <View style={styles.progressTopRow}>
            <View>
              <Text style={styles.progressLabel}>
                DAILY PROGRESS
              </Text>

              <Text style={styles.progressTitle}>
                You're doing great!
              </Text>
            </View>

            <View style={styles.starHolder}>
              <Text style={styles.starText}>★</Text>
            </View>
          </View>

          <View style={styles.progressInfo}>
            <Text style={styles.progressCount}>
              {completedTasks} of {tasks.length} tasks completed
            </Text>

            <Text style={styles.progressPercentage}>
              {Math.round(progress)}%
            </Text>
          </View>

          <View style={styles.progressTrack}>
            <View
              style={[
                styles.progressFill,
                { width: `${progress}%` },
              ]}
            />
          </View>
        </View>

        {/* ADD TASK */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Add a task</Text>
        </View>

        <View style={styles.inputRow}>
          <View style={styles.inputCard}>
            <TextInput
              style={styles.input}
              placeholder="What needs to get done?"
              placeholderTextColor="#B29CA5"
              value={newTask}
              onChangeText={setNewTask}
              onSubmitEditing={addTask}
              returnKeyType="done"
            />
          </View>

          <Pressable
            style={({ pressed }) => [
              styles.addButton,
              pressed && styles.buttonPressed,
              isSaving && styles.disabledButton,
            ]}
            onPress={addTask}
            disabled={isSaving || !newTask.trim()}
          >
            <Text style={styles.addButtonText}>
              {isSaving ? 'Adding...' : '+ Add task'}
            </Text>
          </Pressable>
        </View>

        {/* DATE AND TIME */}
        <View style={styles.dateTimeRow}>
          <Pressable
            style={({ pressed }) => [
              styles.dateTimeButton,
              pressed && styles.buttonPressed,
            ]}
            onPress={() => {
              Keyboard.dismiss();
              setActivePicker('addDate');
            }}
          >
            <Text style={styles.dateTimeText}>
              {dueDate ? dueDate.toLocaleDateString() : 'Add date'}
            </Text>
          </Pressable>

          <Pressable
            style={({ pressed }) => [
              styles.dateTimeButton,
              pressed && styles.buttonPressed,
            ]}
            onPress={() => {
              Keyboard.dismiss();
              setActivePicker('addTime');
            }}
          >
            <Text style={styles.dateTimeText}>
              {dueTime
                ? dueTime.toLocaleTimeString([], {
                    hour: '2-digit',
                    minute: '2-digit',
                  })
                : 'Add time'}
            </Text>
          </Pressable>
        </View>

        {/* PRIORITY SELECTOR */}
        <Text style={styles.priorityLabel}>Set priority</Text>

        <View style={styles.priorityRow}>
          {(['Low', 'Medium', 'High'] as Priority[]).map(item => (
            <Pressable
              key={item}
              onPress={() => setPriority(item)}
              style={({ pressed }) => [
                styles.priorityChip,
                { backgroundColor: priorityColors[item] },
                priority === item && styles.selectedPriorityChip,
                pressed && styles.buttonPressed,
              ]}
            >
              <Text style={styles.priorityStar}>★</Text>

              <Text style={styles.priorityText}>
                {item}
              </Text>
            </Pressable>
          ))}
        </View>

        {/* TASK HEADER */}
        <View style={styles.taskHeader}>
          <Text style={styles.sectionTitle}>My tasks</Text>

          <View style={styles.taskCount}>
            <Text style={styles.taskCountText}>
              {tasks.length} tasks
            </Text>
          </View>
        </View>

        {/* FILTERS */}
        <View style={styles.filterRow}>
          {(
            ['All', 'Pending', 'Completed', 'High', 'Medium', 'Low'] as TaskFilter[]
          ).map(filter => (
            <Pressable
              key={filter}
              onPress={() => setTaskFilter(filter)}
              style={({ pressed }) => [
                styles.filterChip,
                taskFilter === filter && styles.activeFilterChip,
                pressed && styles.buttonPressed,
              ]}
            >
              <Text
                style={[
                  styles.filterText,
                  taskFilter === filter && styles.activeFilterText,
                ]}
              >
                {filter}
              </Text>
            </Pressable>
          ))}
        </View>

        {/* SORT */}
        <Pressable
          style={({ pressed }) => [
            styles.sortButton,
            pressed && styles.buttonPressed,
          ]}
          onPress={() =>
            setSortOrder(current =>
              current === 'Soonest' ? 'Latest' : 'Soonest'
            )
          }
        >
          <Text style={styles.sortButtonText}>
            ↕ Sort: {sortOrder}
          </Text>
        </Pressable>

        {/* TASK LIST */}
        {isLoading ? (
          <View style={styles.emptyCard}>
            <Text style={styles.emptySubtitle}>
              Loading your tasks...
            </Text>
          </View>
        ) : tasks.length === 0 ? (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyTitle}>
              Nothing on your list!
            </Text>

            <Text style={styles.emptySubtitle}>
              Add a task above and start your day.
            </Text>
          </View>
        ) : visibleTasks.length === 0 ? (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyTitle}>
              No matching tasks
            </Text>

            <Text style={styles.emptySubtitle}>
              Try another filter to see your tasks.
            </Text>
          </View>
        ) : (
          visibleTasks.map(task => (
            <Pressable
              key={task.id}
              onPress={() => {
                if (editingTaskId !== task.id) {
                  startEditing(task);
                }
              }}
              style={[
                styles.taskCard,
                { backgroundColor: getTaskColor(task.id) },
                editingTaskId === task.id && styles.editingCard,
              ]}
            >
              {editingTaskId === task.id ? (
                <View style={styles.editContainer}>
                  <Text style={styles.editHeading}>Edit task</Text>

                  <TextInput
                    style={styles.editInput}
                    value={editTitle}
                    onChangeText={setEditTitle}
                    placeholder="Task title"
                    placeholderTextColor="#A995A7"
                  />

                  <Text style={styles.priorityLabel}>
                    Change priority
                  </Text>

                  <View style={styles.editPriorityRow}>
                    {(['Low', 'Medium', 'High'] as Priority[]).map(item => (
                      <Pressable
                        key={item}
                        onPress={() => setEditPriority(item)}
                        style={[
                          styles.editPriorityChip,
                          { backgroundColor: priorityColors[item] },
                          editPriority === item && styles.selectedPriorityChip,
                        ]}
                      >
                        <Text style={styles.priorityText}>
                          {item}
                        </Text>
                      </Pressable>
                    ))}
                  </View>

                  <Text style={styles.priorityLabel}>
                    Change date and time
                  </Text>

                  <View style={styles.editDateTimeRow}>
                    <Pressable
                      style={styles.editDateButton}
                      onPress={() => {
                        Keyboard.dismiss();
                        setActivePicker('editDate');
                      }}
                    >
                      <Text style={styles.dateTimeText}>
                        {editDueDate
                          ? editDueDate.toLocaleDateString()
                          : 'Add date'}
                      </Text>
                    </Pressable>

                    <Pressable
                      style={styles.editDateButton}
                      onPress={() => {
                        Keyboard.dismiss();
                        setActivePicker('editTime');
                      }}
                    >
                      <Text style={styles.dateTimeText}>
                        {editDueTime
                          ? editDueTime.toLocaleTimeString([], {
                              hour: '2-digit',
                              minute: '2-digit',
                            })
                          : 'Add time'}
                      </Text>
                    </Pressable>
                  </View>

                  <View style={styles.editDateTimeRow}>
                    <Pressable onPress={() => setEditDueDate(null)}>
                      <Text style={styles.clearText}>Clear date</Text>
                    </Pressable>

                    <Pressable onPress={() => setEditDueTime(null)}>
                      <Text style={styles.clearText}>Clear time</Text>
                    </Pressable>
                  </View>

                  <View style={styles.editButtons}>
                    <Pressable
                      style={styles.cancelButton}
                      onPress={cancelEditing}
                    >
                      <Text style={styles.cancelButtonText}>
                        Cancel
                      </Text>
                    </Pressable>

                    <Pressable
                      style={styles.saveButton}
                      onPress={saveEditedTask}
                    >
                      <Text style={styles.saveButtonText}>
                        Save changes
                      </Text>
                    </Pressable>
                  </View>
                </View>
              ) : (
                <>
                  {/* CHECKBOX */}
                  <Pressable
                    style={[
                      styles.checkbox,
                      task.completed && styles.checkedBox,
                    ]}
                    onPress={() => toggleTask(task.id)}
                  >
                    {task.completed && (
                      <Text style={styles.checkmark}>✓</Text>
                    )}
                  </Pressable>

                  {/* TASK DETAILS */}
                  <View style={styles.taskDetails}>
                    <Text
                      style={[
                        styles.taskTitle,
                        task.completed && styles.completedTitle,
                      ]}
                    >
                      {task.title}
                    </Text>

                    <View style={styles.taskMeta}>
                      <View
                        style={[
                          styles.priorityDot,
                          {
                            backgroundColor: priorityColors[task.priority],
                          },
                        ]}
                      />

                      <Text style={styles.taskPriority}>
                        {task.priority} priority
                      </Text>
                    </View>

                    {(task.due_date || task.due_time) && (
                      <Text style={styles.taskDeadline}>
                        {task.due_date || ''}
                        {task.due_date && task.due_time ? ' • ' : ''}
                        {task.due_time ? task.due_time.slice(0, 5) : ''}
                      </Text>
                    )}
                  </View>

                  {/* DELETE */}
                  <Pressable
                    style={styles.deleteButton}
                    onPress={() => deleteTask(task.id)}
                  >
                    <Text style={styles.deleteText}>×</Text>
                  </Pressable>
                </>
              )}
            </Pressable>
          ))
        )}

        {/* FOOTER */}
        <Text style={styles.footer}>
          ♥  Small steps, big achievements.  ♥
        </Text>
      </ScrollView>

      {/* FLOATING DATE AND TIME PICKER */}
      <Modal
        transparent
        visible={activePicker !== null}
        animationType="fade"
        statusBarTranslucent
        onRequestClose={() => setActivePicker(null)}
      >
        <Pressable
          style={styles.modalOverlay}
          onPress={() => setActivePicker(null)}
        >
          <Pressable
            style={styles.pickerPopup}
            onPress={event => event.stopPropagation()}
          >
            <View style={styles.pickerHeader}>
              <Text style={styles.pickerTitle}>
                {pickerTitle}
              </Text>

              <Pressable
                style={styles.pickerCloseButton}
                onPress={() => setActivePicker(null)}
              >
                <Text style={styles.pickerCloseText}>×</Text>
              </Pressable>
            </View>

            {activePicker !== null && (
              <DateTimePicker
                key={activePicker}
                value={pickerValue}
                mode={isDatePicker ? 'date' : 'time'}
                display={
                  isDatePicker
                    ? Platform.OS === 'ios'
                      ? 'inline'
                      : 'calendar'
                    : Platform.OS === 'ios'
                      ? 'spinner'
                      : 'clock'
                }
                onChange={
                  isDatePicker
                    ? handleDateChange
                    : handleTimeChange
                }
              />
            )}
          </Pressable>
        </Pressable>
      </Modal>
    </SafeAreaView>
  );
}

// ======================================================
// HEAVY CLAYMORPHISM STYLES
// ======================================================

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#F7EEDC',
  },

  container: {
    paddingHorizontal: 21,
    paddingTop: 17,
    paddingBottom: 40,
  },

  // HEADER
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },

  logo: {
    fontSize: 29,
    fontWeight: '900',
    color: '#74447F',
    letterSpacing: -1.3,
  },

  date: {
    color: '#A77E9F',
    fontSize: 12,
    marginTop: 5,
    fontWeight: '700',
  },

  avatar: {
    width: 55,
    height: 55,
    borderRadius: 21,
    backgroundColor: '#CDB9F0',
    justifyContent: 'center',
    alignItems: 'center',
    borderTopWidth: 2,
    borderLeftWidth: 2,
    borderColor: '#F9F0FF',
    borderBottomWidth: 4,
    borderBottomColor: '#A993CE',
    shadowColor: '#806B94',
    shadowOffset: { width: 6, height: 8 },
    shadowOpacity: 0.38,
    shadowRadius: 10,
    elevation: 8,
  },

  avatarInner: {
    width: 39,
    height: 39,
    borderRadius: 15,
    backgroundColor: '#E8DDF8',
    justifyContent: 'center',
    alignItems: 'center',
    borderTopWidth: 2,
    borderLeftWidth: 2,
    borderColor: '#FFFFFF',
    shadowColor: '#9F8CB7',
    shadowOffset: { width: 2, height: 3 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 3,
  },

  avatarText: {
    color: '#74518B',
    fontSize: 23,
    fontWeight: '900',
  },

  // GREETING
  greetingSection: {
    marginTop: 33,
    marginBottom: 24,
  },

  greeting: {
    fontSize: 23,
    fontWeight: '900',
    color: '#774B7C',
    letterSpacing: -0.7,
  },

  subtitle: {
    color: '#AC83A5',
    fontSize: 14,
    marginTop: 7,
    fontWeight: '600',
  },

  // PROGRESS CARD
  progressCard: {
    backgroundColor: '#DCC4F0',
    borderRadius: 31,
    padding: 21,
    marginBottom: 32,
    borderTopWidth: 3,
    borderLeftWidth: 2,
    borderColor: '#FFF7FF',
    borderBottomWidth: 5,
    borderBottomColor: '#B99CD3',
    borderRightWidth: 2,
    borderRightColor: '#C5A9DC',
    shadowColor: '#92749D',
    shadowOffset: { width: 7, height: 10 },
    shadowOpacity: 0.42,
    shadowRadius: 13,
    elevation: 9,
  },

  progressTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },

  progressLabel: {
    color: '#96669B',
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 1.7,
  },

  progressTitle: {
    color: '#75467D',
    fontSize: 19,
    fontWeight: '900',
    marginTop: 8,
  },

  starHolder: {
    width: 48,
    height: 48,
    borderRadius: 18,
    backgroundColor: '#E8D8F6',
    justifyContent: 'center',
    alignItems: 'center',
    borderTopWidth: 2,
    borderLeftWidth: 2,
    borderColor: '#FFF8FF',
    borderBottomWidth: 3,
    borderBottomColor: '#C5ACD9',
    shadowColor: '#9479A4',
    shadowOffset: { width: 3, height: 5 },
    shadowOpacity: 0.32,
    shadowRadius: 6,
    elevation: 5,
  },

  starText: {
    color: '#F6C95E',
    fontSize: 29,
    textShadowColor: '#D7A94A',
    textShadowOffset: { width: 1, height: 2 },
    textShadowRadius: 3,
  },

  progressInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 23,
    marginBottom: 11,
  },

  progressCount: {
    color: '#936D99',
    fontSize: 12,
    fontWeight: '700',
  },

  progressPercentage: {
    color: '#74477D',
    fontSize: 13,
    fontWeight: '900',
  },

  progressTrack: {
    height: 13,
    backgroundColor: '#C8AFDF',
    borderRadius: 20,
    overflow: 'hidden',
    borderBottomWidth: 2,
    borderBottomColor: '#B99BCF',
    borderTopWidth: 1,
    borderTopColor: '#BDA4D2',
  },

  progressFill: {
    height: '100%',
    backgroundColor: '#9565B0',
    borderRadius: 20,
    borderTopWidth: 2,
    borderTopColor: '#D6B9ED',
    borderBottomWidth: 1,
    borderBottomColor: '#82539D',
  },

  // SECTION HEADINGS
  sectionHeader: {
    marginBottom: 14,
  },

  sectionTitle: {
    fontSize: 20,
    fontWeight: '900',
    color: '#754B7C',
    letterSpacing: -0.4,
  },

  // INPUT
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 11,
  },

  inputCard: {
    flex: 1,
    backgroundColor: '#F8E9D9',
    borderRadius: 23,
    borderTopWidth: 2,
    borderLeftWidth: 2,
    borderColor: '#FFF9EF',
    borderBottomWidth: 4,
    borderBottomColor: '#D9BFAE',
    shadowColor: '#A98A7A',
    shadowOffset: { width: 5, height: 7 },
    shadowOpacity: 0.32,
    shadowRadius: 9,
    elevation: 5,
  },

  input: {
    paddingHorizontal: 15,
    paddingVertical: 17,
    fontSize: 13,
    color: '#76566F',
    fontWeight: '600',
  },

  addButton: {
    backgroundColor: '#B88BD5',
    paddingHorizontal: 16,
    paddingVertical: 17,
    borderRadius: 20,
    borderTopWidth: 2,
    borderLeftWidth: 2,
    borderColor: '#F4DFFF',
    borderBottomWidth: 4,
    borderBottomColor: '#9166AF',
    shadowColor: '#8C6C9D',
    shadowOffset: { width: 5, height: 7 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 6,
  },

  addButtonText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '900',
  },

  disabledButton: {
    opacity: 0.55,
  },

  buttonPressed: {
    transform: [{ translateY: 2 }],
    opacity: 0.9,
  },

  // DATE AND TIME
  dateTimeRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 19,
  },

  dateTimeButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 9,
    backgroundColor: '#E9D8EF',
    paddingHorizontal: 12,
    paddingVertical: 15,
    borderRadius: 21,
    borderTopWidth: 2,
    borderLeftWidth: 2,
    borderColor: '#FFF8FF',
    borderBottomWidth: 4,
    borderBottomColor: '#C7AFCF',
    shadowColor: '#A88CA9',
    shadowOffset: { width: 4, height: 6 },
    shadowOpacity: 0.34,
    shadowRadius: 7,
    elevation: 5,
  },

  dateTimeText: {
    color: '#88558E',
    fontSize: 12,
    fontWeight: '900',
  },

  // PRIORITY
  priorityLabel: {
    color: '#A4779A',
    fontSize: 13,
    fontWeight: '900',
    marginTop: 20,
    marginBottom: 11,
  },

  priorityRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 9,
    marginBottom: 32,
    paddingTop: 5,
    paddingBottom: 7,
  },

  priorityChip: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingHorizontal: 7,
    paddingVertical: 13,
    borderRadius: 20,
    borderTopWidth: 2,
    borderLeftWidth: 2,
    borderColor: '#FFFDF5',
    borderBottomWidth: 4,
    borderBottomColor: '#C8BDA8',
    shadowColor: '#A18B7A',
    shadowOffset: { width: 4, height: 6 },
    shadowOpacity: 0.32,
    shadowRadius: 7,
    elevation: 5,
  },

  // SELECTED BUTTON: BIGGER, HIGHER AND MORE RAISED
  selectedPriorityChip: {
    transform: [
      { scale: 1.09 },
      { translateY: -4 },
    ],
    zIndex: 10,
    elevation: 12,
    borderTopWidth: 3,
    borderLeftWidth: 3,
    borderBottomWidth: 5,
    shadowColor: '#806B59',
    shadowOffset: { width: 2, height: 10 },
    shadowOpacity: 0.48,
    shadowRadius: 11,
  },

  priorityStar: {
    color: '#FFFFFF',
    fontSize: 14,
    textShadowColor: 'rgba(120, 90, 50, 0.3)',
    textShadowOffset: { width: 1, height: 2 },
    textShadowRadius: 2,
  },

  priorityText: {
    color: '#795F70',
    fontSize: 11,
    fontWeight: '900',
  },

  // TASK HEADER
  taskHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },

  taskCount: {
    backgroundColor: '#E7D2EE',
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 17,
    borderTopWidth: 2,
    borderLeftWidth: 2,
    borderColor: '#FFF7FF',
    borderBottomWidth: 3,
    borderBottomColor: '#C5ACCF',
    shadowColor: '#A78BA8',
    shadowOffset: { width: 3, height: 5 },
    shadowOpacity: 0.3,
    shadowRadius: 5,
    elevation: 4,
  },

  taskCountText: {
    color: '#86558F',
    fontSize: 11,
    fontWeight: '900',
  },

  // FILTERS
  filterRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 9,
    marginBottom: 15,
  },

  filterChip: {
    backgroundColor: '#F2E4E7',
    paddingHorizontal: 14,
    paddingVertical: 11,
    borderRadius: 18,
    borderTopWidth: 2,
    borderLeftWidth: 2,
    borderColor: '#FFF9F5',
    borderBottomWidth: 3,
    borderBottomColor: '#D9C2C7',
    shadowColor: '#A88E8D',
    shadowOffset: { width: 3, height: 5 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 4,
  },

  activeFilterChip: {
    backgroundColor: '#B98BD6',
    borderColor: '#F6E5FF',
    borderBottomColor: '#9168AC',
  },

  filterText: {
    color: '#9A7191',
    fontSize: 11,
    fontWeight: '900',
  },

  activeFilterText: {
    color: '#FFFFFF',
  },

  // SORT
  sortButton: {
    alignSelf: 'flex-end',
    backgroundColor: '#E5D0F1',
    paddingHorizontal: 16,
    paddingVertical: 11,
    borderRadius: 19,
    marginBottom: 19,
    borderTopWidth: 2,
    borderLeftWidth: 2,
    borderColor: '#FFF8FF',
    borderBottomWidth: 4,
    borderBottomColor: '#C0A5D0',
    shadowColor: '#A18AA9',
    shadowOffset: { width: 4, height: 6 },
    shadowOpacity: 0.34,
    shadowRadius: 7,
    elevation: 5,
  },

  sortButtonText: {
    color: '#83538D',
    fontSize: 11,
    fontWeight: '900',
  },

  // TASK CARDS
  taskCard: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 25,
    padding: 16,
    marginBottom: 16,
    borderTopWidth: 2,
    borderLeftWidth: 2,
    borderColor: '#FFFFFF',
    borderBottomWidth: 4,
    borderBottomColor: '#C8BDAE',
    borderRightWidth: 2,
    borderRightColor: '#D7CBBE',
    shadowColor: '#A18C7C',
    shadowOffset: { width: 5, height: 7 },
    shadowOpacity: 0.34,
    shadowRadius: 9,
    elevation: 6,
  },

  editingCard: {
    alignItems: 'stretch',
    backgroundColor: '#E9D8F1',
    borderColor: '#FFFFFF',
    borderBottomColor: '#C2A9D0',
  },

  checkbox: {
    width: 27,
    height: 27,
    borderRadius: 10,
    backgroundColor: 'rgba(255,255,255,0.6)',
    borderWidth: 2,
    borderColor: 'rgba(150,120,140,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#927D76',
    shadowOffset: { width: 2, height: 3 },
    shadowOpacity: 0.23,
    shadowRadius: 4,
    elevation: 3,
  },

  checkedBox: {
    backgroundColor: '#8FB77E',
    borderColor: '#E9FFE2',
  },

  checkmark: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '900',
  },

  taskDetails: {
    flex: 1,
    marginLeft: 13,
  },

  taskTitle: {
    fontSize: 13,
    fontWeight: '900',
    color: '#70536F',
  },

  completedTitle: {
    textDecorationLine: 'line-through',
    color: '#998B91',
  },

  taskMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 7,
  },

  priorityDot: {
    width: 9,
    height: 9,
    borderRadius: 5,
    borderWidth: 1,
    borderColor: 'rgba(100,80,80,0.15)',
  },

  taskPriority: {
    color: '#927A83',
    fontSize: 10,
    fontWeight: '700',
  },

  taskDeadline: {
    color: '#94788E',
    fontSize: 10,
    fontWeight: '700',
    marginTop: 6,
  },

  deleteButton: {
    width: 34,
    height: 34,
    borderRadius: 13,
    backgroundColor: '#F2B9C0',
    justifyContent: 'center',
    alignItems: 'center',
    borderTopWidth: 2,
    borderLeftWidth: 2,
    borderColor: '#FFF0F0',
    borderBottomWidth: 3,
    borderBottomColor: '#D78F9B',
    shadowColor: '#B67E87',
    shadowOffset: { width: 3, height: 4 },
    shadowOpacity: 0.32,
    shadowRadius: 5,
    elevation: 4,
  },

  deleteText: {
    color: '#BD6879',
    fontSize: 23,
    lineHeight: 26,
    fontWeight: '900',
  },

  // EDIT FORM
  editContainer: {
    width: '100%',
  },

  editHeading: {
    fontSize: 18,
    fontWeight: '900',
    color: '#754B7C',
    marginBottom: 15,
  },

  editInput: {
    backgroundColor: '#F3E6F0',
    borderRadius: 17,
    paddingHorizontal: 15,
    paddingVertical: 14,
    fontSize: 14,
    color: '#704C75',
    fontWeight: '600',
    borderTopWidth: 2,
    borderLeftWidth: 2,
    borderColor: '#FFF9FF',
    borderBottomWidth: 3,
    borderBottomColor: '#D1BBD0',
    shadowColor: '#A48BA0',
    shadowOffset: { width: 3, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 5,
    elevation: 3,
  },

  editPriorityRow: {
    flexDirection: 'row',
    gap: 9,
    flexWrap: 'wrap',
    paddingTop: 5,
    paddingBottom: 7,
  },

  editPriorityChip: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 15,
    borderTopWidth: 2,
    borderLeftWidth: 2,
    borderColor: '#FFFFFF',
    borderBottomWidth: 3,
    borderBottomColor: '#C8BDA8',
    shadowColor: '#A18B7A',
    shadowOffset: { width: 2, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 3,
  },

  editDateTimeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginTop: 12,
    flexWrap: 'wrap',
  },

  editDateButton: {
    backgroundColor: '#EAD9EF',
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 16,
    borderTopWidth: 2,
    borderLeftWidth: 2,
    borderColor: '#FFFFFF',
    borderBottomWidth: 3,
    borderBottomColor: '#C5ADC9',
    shadowColor: '#A18AA4',
    shadowOffset: { width: 3, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 3,
  },

  clearText: {
    color: '#A56D91',
    fontSize: 11,
    fontWeight: '900',
    paddingVertical: 5,
  },

  editButtons: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 11,
    marginTop: 21,
  },

  cancelButton: {
    backgroundColor: '#F0E2E8',
    paddingHorizontal: 18,
    paddingVertical: 13,
    borderRadius: 16,
    borderTopWidth: 2,
    borderLeftWidth: 2,
    borderColor: '#FFFFFF',
    borderBottomWidth: 3,
    borderBottomColor: '#D0B9C1',
    shadowColor: '#A58C92',
    shadowOffset: { width: 2, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 3,
  },

  cancelButtonText: {
    color: '#98768A',
    fontSize: 12,
    fontWeight: '900',
  },

  saveButton: {
    backgroundColor: '#B68BD0',
    paddingHorizontal: 19,
    paddingVertical: 13,
    borderRadius: 16,
    borderTopWidth: 2,
    borderLeftWidth: 2,
    borderColor: '#F7E8FF',
    borderBottomWidth: 3,
    borderBottomColor: '#9069AA',
    shadowColor: '#9877A8',
    shadowOffset: { width: 3, height: 5 },
    shadowOpacity: 0.32,
    shadowRadius: 5,
    elevation: 4,
  },

  saveButtonText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '900',
  },

  // EMPTY STATE
  emptyCard: {
    backgroundColor: '#F0E1E8',
    borderRadius: 26,
    padding: 31,
    alignItems: 'center',
    borderTopWidth: 2,
    borderLeftWidth: 2,
    borderColor: '#FFFFFF',
    borderBottomWidth: 4,
    borderBottomColor: '#D3BBC3',
    shadowColor: '#A58B91',
    shadowOffset: { width: 5, height: 7 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },

  emptyTitle: {
    color: '#754B7C',
    fontSize: 17,
    fontWeight: '900',
    marginTop: 10,
  },

  emptySubtitle: {
    color: '#A7839A',
    fontSize: 12,
    marginTop: 8,
    textAlign: 'center',
    lineHeight: 19,
  },

  // FOOTER
  footer: {
    textAlign: 'center',
    color: '#B17F9D',
    fontSize: 12,
    fontWeight: '800',
    marginTop: 27,
  },

  // DATE AND TIME MODAL
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(89, 64, 88, 0.36)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },

  pickerPopup: {
    width: '100%',
    maxWidth: 360,
    backgroundColor: '#F2E5EE',
    borderRadius: 29,
    padding: 19,
    borderTopWidth: 2,
    borderLeftWidth: 2,
    borderColor: '#FFFFFF',
    borderBottomWidth: 4,
    borderBottomColor: '#D0B8C8',
    shadowColor: '#765D77',
    shadowOffset: { width: 7, height: 10 },
    shadowOpacity: 0.38,
    shadowRadius: 13,
    elevation: 12,
  },

  pickerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 13,
  },

  pickerTitle: {
    color: '#754B7C',
    fontSize: 18,
    fontWeight: '900',
  },

  pickerCloseButton: {
    width: 34,
    height: 34,
    borderRadius: 13,
    backgroundColor: '#E5D3E5',
    justifyContent: 'center',
    alignItems: 'center',
    borderTopWidth: 2,
    borderLeftWidth: 2,
    borderColor: '#FFFFFF',
    borderBottomWidth: 3,
    borderBottomColor: '#C5ACC5',
    shadowColor: '#A18AA0',
    shadowOffset: { width: 2, height: 3 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 3,
  },

  pickerCloseText: {
    color: '#89668B',
    fontSize: 22,
    lineHeight: 25,
    fontWeight: '900',
  },
});
